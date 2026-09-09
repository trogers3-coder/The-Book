import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase";
import type { Json } from "@/lib/database.types";

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-neutral-100">{value}</dd>
    </div>
  );
}

type Contact = { name?: string | null; role?: string | null; phone?: string | null; email?: string | null };

export default async function CallSheetDetailPage({ params }: PageProps<"/call-sheets/[id]">) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: callSheet } = await db.from("call_sheets").select("*").eq("id", id).single();
  if (!callSheet) notFound();

  const [{ data: message }, { data: attachments }] = await Promise.all([
    db.from("messages").select("*").eq("id", callSheet.message_id).single(),
    db.from("attachments").select("*").eq("message_id", callSheet.message_id),
  ]);

  const contacts = (Array.isArray(callSheet.contacts) ? callSheet.contacts : []) as unknown as Contact[];
  const title = [callSheet.client, callSheet.brand].filter(Boolean).join(" × ") || callSheet.project_name || "Untitled job";

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-neutral-400 hover:text-white">
        ← Back to archive
      </Link>

      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {callSheet.project_name && callSheet.project_name !== title && (
          <p className="text-neutral-400">{callSheet.project_name}</p>
        )}
        {typeof callSheet.confidence === "number" && (
          <p className="mt-1 text-xs text-neutral-600">Extraction confidence: {Math.round(callSheet.confidence * 100)}%</p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-neutral-800 p-4 sm:grid-cols-3">
        <Field label="Shoot date" value={callSheet.shoot_date} />
        <Field label="Through" value={callSheet.shoot_end_date} />
        <Field label="Call time" value={callSheet.call_time} />
        <Field label="Wrap time" value={callSheet.wrap_time} />
        <Field label="Role" value={callSheet.role} />
        <Field
          label="Rate"
          value={
            callSheet.day_rate !== null
              ? `${callSheet.day_rate} ${callSheet.rate_currency ?? ""}${callSheet.rate_unit ? ` / ${callSheet.rate_unit}` : ""}`
              : null
          }
        />
        <Field label="Usage terms" value={callSheet.usage_terms} />
        <Field label="Location" value={callSheet.location_name} />
        <Field label="Address" value={callSheet.location_address} />
        <Field label="Agency" value={callSheet.agency} />
        <Field label="Agent" value={callSheet.agent_name} />
        <Field label="Agent email" value={callSheet.agent_email} />
        <Field label="Agent phone" value={callSheet.agent_phone} />
        <Field label="Photographer" value={callSheet.photographer} />
      </dl>

      {contacts.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-300">Other contacts</h2>
          <ul className="mt-2 space-y-1 text-sm text-neutral-400">
            {contacts.map((c, i) => (
              <li key={i}>
                {[c.name, c.role, c.phone, c.email].filter(Boolean).join(" · ")}
              </li>
            ))}
          </ul>
        </div>
      )}

      {callSheet.wardrobe_notes && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-300">Wardrobe notes</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-400">{callSheet.wardrobe_notes}</p>
        </div>
      )}

      {callSheet.notes && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-300">Notes</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-400">{callSheet.notes}</p>
        </div>
      )}

      {callSheet.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {callSheet.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-neutral-800 p-4">
        <h2 className="text-sm font-semibold text-neutral-300">Source email</h2>
        {message && (
          <div className="mt-2 space-y-1 text-sm text-neutral-400">
            <p>{message.subject}</p>
            <p>
              From {message.from_name ? `${message.from_name} <${message.from_address}>` : message.from_address}
              {message.message_date && ` · ${new Date(message.message_date).toLocaleString()}`}
            </p>
            {message.gmail_thread_id && (
              <a
                href={`https://mail.google.com/mail/u/0/#all/${message.gmail_thread_id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-neutral-300 underline hover:text-white"
              >
                Open in Gmail
              </a>
            )}
          </div>
        )}
        {(attachments ?? []).length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {attachments!.map((att) => (
              <li key={att.id}>
                <a href={`/api/attachments/${att.id}`} className="text-neutral-300 underline hover:text-white">
                  {att.filename}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <RawExtractionDetails raw={callSheet.raw_extraction} />
    </div>
  );
}

function RawExtractionDetails({ raw }: { raw: Json }) {
  if (!raw) return null;
  return (
    <details className="rounded-lg border border-neutral-800 p-4 text-sm">
      <summary className="cursor-pointer text-neutral-400">Raw extraction (debug)</summary>
      <pre className="mt-2 overflow-x-auto text-xs text-neutral-500">{JSON.stringify(raw, null, 2)}</pre>
    </details>
  );
}
