import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const ContactSchema = z.object({
  name: z.string().nullable(),
  role: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
});

const CallSheetExtractionSchema = z.object({
  is_call_sheet: z
    .boolean()
    .describe(
      "True only if this document is a modeling/talent call sheet, booking confirmation, or rate " +
        "confirmation for a specific shoot/job. False for anything else: newsletters, receipts, personal " +
        "email, unrelated attachments, or a generic email that merely mentions a shoot in passing."
    ),
  confidence: z.number().min(0).max(1).describe("Confidence that is_call_sheet is correct, 0-1."),
  shoot_date: z.string().nullable().describe("ISO date YYYY-MM-DD the shoot/job starts. Null if unknown."),
  shoot_end_date: z.string().nullable().describe("ISO date YYYY-MM-DD if the job spans multiple days."),
  call_time: z.string().nullable().describe("Reported call time, verbatim, e.g. '7:00 AM'."),
  wrap_time: z.string().nullable(),
  client: z.string().nullable().describe("The end client, e.g. the retailer or company being shot for."),
  brand: z.string().nullable(),
  project_name: z.string().nullable().describe("Campaign or project name, if given."),
  role: z.string().nullable().describe("The talent's role on the job, e.g. 'Fit model', 'Lead', 'Hand model'."),
  day_rate: z.number().nullable().describe("Numeric rate amount, without currency symbol."),
  rate_unit: z.string().nullable().describe("What the rate is per, e.g. 'day', 'hour', 'flat'."),
  rate_currency: z.string().nullable().describe("ISO currency code, e.g. 'USD'. Default to USD if a $ sign is used with no other indication."),
  usage_terms: z.string().nullable().describe("Usage/licensing terms, e.g. 'digital only, 1 year'."),
  location_name: z.string().nullable().describe("Studio or venue name."),
  location_address: z.string().nullable(),
  agency: z.string().nullable().describe("Modeling/talent agency handling the booking."),
  agent_name: z.string().nullable(),
  agent_email: z.string().nullable(),
  agent_phone: z.string().nullable(),
  photographer: z.string().nullable(),
  contacts: z.array(ContactSchema).describe("Any other named contacts on the job (stylist, producer, client contact, etc.)."),
  wardrobe_notes: z.string().nullable(),
  notes: z.string().nullable().describe("Anything else worth keeping that doesn't fit another field."),
  tags: z.array(z.string()).describe("Short freeform tags, e.g. ['ecommerce', 'fit model', 'studio']."),
});

export type CallSheetExtraction = z.infer<typeof CallSheetExtractionSchema>;

export type ExtractionDocument =
  | { kind: "text"; text: string }
  | { kind: "pdf"; data: Buffer }
  | { kind: "image"; data: Buffer; mimeType: string };

export type ExtractionContext = {
  subject: string | null;
  from: string | null;
  date: string | null;
  /** Extra plain text to include alongside a pdf/image document, e.g. the surrounding email body. */
  extraText?: string | null;
};

const MODEL = process.env.CLAUDE_EXTRACTION_MODEL || "claude-opus-5";

function buildPrompt(ctx: ExtractionContext): string {
  return [
    "You are extracting structured data from a piece of a model/talent's email inbox so it can be archived",
    "in a searchable career database. Decide whether the attached document (or the text below) is a call",
    "sheet, booking confirmation, or rate confirmation for a shoot/job, and if so extract every field you",
    "can find. Leave fields null rather than guessing. Dates should be normalized to ISO YYYY-MM-DD when a",
    "year is determinable from context (use the email date to resolve dates given without a year).",
    "",
    `Email subject: ${ctx.subject ?? "(none)"}`,
    `Email from: ${ctx.from ?? "(unknown)"}`,
    `Email date: ${ctx.date ?? "(unknown)"}`,
    ctx.extraText ? `\nEmail body:\n${ctx.extraText}` : "",
  ].join("\n");
}

export async function extractCallSheet(
  ctx: ExtractionContext,
  doc: ExtractionDocument
): Promise<CallSheetExtraction> {
  const client = new Anthropic();

  const content: Anthropic.Messages.ContentBlockParam[] = [];
  if (doc.kind === "pdf") {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: doc.data.toString("base64") },
    });
  } else if (doc.kind === "image") {
    content.push({
      type: "image",
      source: { type: "base64", media_type: doc.mimeType as "image/png", data: doc.data.toString("base64") },
    });
  }

  content.push({
    type: "text",
    text: buildPrompt(doc.kind === "text" ? { ...ctx, extraText: ctx.extraText ?? doc.text } : ctx),
  });

  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: "user", content }],
    output_config: { format: zodOutputFormat(CallSheetExtractionSchema) },
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return {
      is_call_sheet: false,
      confidence: 0,
      shoot_date: null,
      shoot_end_date: null,
      call_time: null,
      wrap_time: null,
      client: null,
      brand: null,
      project_name: null,
      role: null,
      day_rate: null,
      rate_unit: null,
      rate_currency: null,
      usage_terms: null,
      location_name: null,
      location_address: null,
      agency: null,
      agent_name: null,
      agent_email: null,
      agent_phone: null,
      photographer: null,
      contacts: [],
      wardrobe_notes: null,
      notes: null,
      tags: [],
    };
  }

  return response.parsed_output;
}
