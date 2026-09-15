import { gmailClientForAccount } from "./google";
import { parseGmailMessage } from "./gmail-parse";
import { extractCallSheet, type ExtractionDocument } from "./extract";
import { extractPdfText } from "./pdf";
import { supabaseAdmin } from "./supabase";
import type { Tables } from "./database.types";

const DEFAULT_QUERY =
  '(subject:"call sheet" OR subject:(calltime OR "call time") OR "call sheet" OR "rate confirmation" ' +
  'OR "booking confirmation" OR "wardrobe" OR filename:pdf) -category:promotions -category:social';

const ATTACHMENTS_BUCKET = "call-sheet-attachments";
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export type SyncSummary = {
  accountEmail: string;
  messagesFound: number;
  messagesProcessed: number;
  callSheetsExtracted: number;
  reachedEnd: boolean;
  error?: string;
};

export async function syncAccount(
  account: Tables<"gmail_accounts">,
  opts: { limit?: number } = {}
): Promise<SyncSummary> {
  const limit = opts.limit ?? envInt("SYNC_MESSAGE_LIMIT", 25);
  const lookbackDays = envInt("GMAIL_SYNC_LOOKBACK_DAYS", 3650);
  const overlapDays = envInt("GMAIL_SYNC_OVERLAP_DAYS", 2);
  const confidenceThreshold = Number(process.env.CALL_SHEET_CONFIDENCE_THRESHOLD ?? "0.5");
  const query = process.env.GMAIL_QUERY || DEFAULT_QUERY;

  const db = supabaseAdmin();
  const gmail = gmailClientForAccount(account);

  const { data: syncRun } = await db
    .from("sync_runs")
    .insert({ account_id: account.id })
    .select()
    .single();

  const summary: SyncSummary = {
    accountEmail: account.email,
    messagesFound: 0,
    messagesProcessed: 0,
    callSheetsExtracted: 0,
    reachedEnd: false,
  };

  try {
    const afterSeconds = account.last_synced_at
      ? Math.floor(new Date(account.last_synced_at).getTime() / 1000) - overlapDays * 86400
      : Math.floor(Date.now() / 1000) - lookbackDays * 86400;
    const fullQuery = `${query} after:${Math.max(afterSeconds, 0)}`;

    let pageToken: string | undefined;
    let pagesScanned = 0;
    const MAX_PAGES = 20;

    outer: while (pagesScanned < MAX_PAGES) {
      pagesScanned++;
      const listRes = await gmail.users.messages.list({
        userId: "me",
        q: fullQuery,
        pageToken,
        maxResults: 50,
      });

      const ids = (listRes.data.messages ?? []).map((m) => m.id!).filter(Boolean);
      summary.messagesFound += ids.length;

      if (ids.length > 0) {
        const { data: existing } = await db
          .from("messages")
          .select("gmail_message_id")
          .eq("account_id", account.id)
          .in("gmail_message_id", ids);
        const existingIds = new Set((existing ?? []).map((m) => m.gmail_message_id));
        const newIds = ids.filter((id) => !existingIds.has(id));

        for (const id of newIds) {
          if (summary.messagesProcessed >= limit) break outer;
          const extracted = await processMessage(db, gmail, account, id, confidenceThreshold);
          summary.messagesProcessed++;
          summary.callSheetsExtracted += extracted;
        }
      }

      pageToken = listRes.data.nextPageToken ?? undefined;
      if (!pageToken) {
        summary.reachedEnd = true;
        break;
      }
    }

    if (summary.reachedEnd) {
      await db.from("gmail_accounts").update({ last_synced_at: new Date().toISOString() }).eq("id", account.id);
    }

    if (syncRun) {
      await db
        .from("sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          messages_found: summary.messagesFound,
          messages_processed: summary.messagesProcessed,
          call_sheets_extracted: summary.callSheetsExtracted,
          status: "completed",
        })
        .eq("id", syncRun.id);
    }
  } catch (err) {
    summary.error = err instanceof Error ? err.message : String(err);
    if (syncRun) {
      await db
        .from("sync_runs")
        .update({
          finished_at: new Date().toISOString(),
          messages_found: summary.messagesFound,
          messages_processed: summary.messagesProcessed,
          call_sheets_extracted: summary.callSheetsExtracted,
          status: "failed",
          error: summary.error,
        })
        .eq("id", syncRun.id);
    }
  }

  return summary;
}

async function processMessage(
  db: ReturnType<typeof supabaseAdmin>,
  gmail: ReturnType<typeof gmailClientForAccount>,
  account: Tables<"gmail_accounts">,
  gmailMessageId: string,
  confidenceThreshold: number
): Promise<number> {
  const { data: full } = await gmail.users.messages.get({
    userId: "me",
    id: gmailMessageId,
    format: "full",
  });

  const parsed = parseGmailMessage(full);

  const { data: messageRow, error: insertError } = await db
    .from("messages")
    .insert({
      account_id: account.id,
      gmail_message_id: gmailMessageId,
      gmail_thread_id: full.threadId ?? null,
      subject: parsed.subject,
      from_address: parsed.fromAddress,
      from_name: parsed.fromName,
      to_addresses: parsed.toAddresses,
      message_date: parsed.date?.toISOString() ?? null,
      snippet: full.snippet ?? null,
      body_text: parsed.bodyText,
      body_html: parsed.bodyHtml,
      has_attachments: parsed.attachments.length > 0,
    })
    .select()
    .single();

  if (insertError || !messageRow) {
    console.error(`Failed to store message ${gmailMessageId}`, insertError);
    return 0;
  }

  const candidates: { doc: ExtractionDocument; attachmentId: string | null }[] = [];

  if (parsed.bodyText && parsed.bodyText.length > 20) {
    candidates.push({ doc: { kind: "text", text: parsed.bodyText }, attachmentId: null });
  }

  for (const att of parsed.attachments) {
    if (att.size > MAX_ATTACHMENT_BYTES) continue;
    const isPdf = att.mimeType === "application/pdf";
    const isImage = SUPPORTED_IMAGE_TYPES.has(att.mimeType);
    if (!isPdf && !isImage) continue;

    const { data: attData } = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId: gmailMessageId,
      id: att.attachmentId,
    });
    if (!attData.data) continue;
    const bytes = Buffer.from(attData.data, "base64url");

    const storagePath = `${account.id}/${messageRow.id}/${att.filename}`;
    await db.storage.from(ATTACHMENTS_BUCKET).upload(storagePath, bytes, {
      contentType: att.mimeType,
      upsert: true,
    });

    let extractedText: string | null = null;
    if (isPdf) {
      try {
        extractedText = await extractPdfText(bytes);
      } catch {
        // Scanned/image-only PDF or parse failure - extraction below still runs on the raw bytes.
      }
    }

    const { data: attachmentRow } = await db
      .from("attachments")
      .insert({
        message_id: messageRow.id,
        gmail_attachment_id: att.attachmentId,
        filename: att.filename,
        mime_type: att.mimeType,
        size_bytes: att.size,
        storage_path: storagePath,
        extracted_text: extractedText,
      })
      .select()
      .single();

    if (attachmentRow) {
      candidates.push({
        doc: isPdf ? { kind: "pdf", data: bytes } : { kind: "image", data: bytes, mimeType: att.mimeType },
        attachmentId: attachmentRow.id,
      });
    }
  }

  let callSheetsExtracted = 0;
  for (const candidate of candidates) {
    try {
      const extraction = await extractCallSheet(
        {
          subject: parsed.subject,
          from: parsed.fromAddress,
          date: parsed.date?.toISOString() ?? null,
          extraText: candidate.doc.kind === "text" ? null : parsed.bodyText,
        },
        candidate.doc
      );

      if (!extraction.is_call_sheet || extraction.confidence < confidenceThreshold) continue;

      await db.from("call_sheets").insert({
        message_id: messageRow.id,
        account_id: account.id,
        source_attachment_id: candidate.attachmentId,
        shoot_date: extraction.shoot_date,
        shoot_end_date: extraction.shoot_end_date,
        call_time: extraction.call_time,
        wrap_time: extraction.wrap_time,
        client: extraction.client,
        brand: extraction.brand,
        project_name: extraction.project_name,
        role: extraction.role,
        day_rate: extraction.day_rate,
        rate_unit: extraction.rate_unit,
        rate_currency: extraction.rate_currency,
        usage_terms: extraction.usage_terms,
        location_name: extraction.location_name,
        location_address: extraction.location_address,
        agency: extraction.agency,
        agent_name: extraction.agent_name,
        agent_email: extraction.agent_email,
        agent_phone: extraction.agent_phone,
        photographer: extraction.photographer,
        contacts: extraction.contacts,
        wardrobe_notes: extraction.wardrobe_notes,
        notes: extraction.notes,
        tags: extraction.tags,
        confidence: extraction.confidence,
        raw_extraction: extraction,
      });
      callSheetsExtracted++;
    } catch (err) {
      console.error(`Extraction failed for message ${gmailMessageId}`, err);
    }
  }

  return callSheetsExtracted;
}
