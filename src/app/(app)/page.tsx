import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatDate(value: string | null): string {
  if (!value) return "Date unknown";
  return new Date(value + "T00:00:00").toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRate(amount: number | null, unit: string | null, currency: string | null): string | null {
  if (amount === null) return null;
  const money = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  }).format(amount);
  return unit ? `${money} / ${unit}` : money;
}

export default async function ArchivePage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const q = firstParam(params.q).trim();

  const db = supabaseAdmin();

  const { count: accountCount } = await db.from("gmail_accounts").select("*", { count: "exact", head: true });

  let query = db
    .from("call_sheets")
    .select("*")
    .order("shoot_date", { ascending: false, nullsFirst: false })
    .limit(50);

  if (q) {
    // websearch_to_tsquery tolerates arbitrary user input (quotes, punctuation)
    // without throwing, unlike to_tsquery/plainto_tsquery.
    query = query.textSearch("search_vector", q, { type: "websearch", config: "english" });
  }

  const { data: callSheets, error } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Your archive</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Every call sheet pulled from your connected inboxes, extracted and searchable.
        </p>
      </div>

      {accountCount === 0 && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-200">
          No Gmail inboxes connected yet.{" "}
          <Link href="/accounts" className="underline hover:text-amber-100">
            Connect one to start syncing
          </Link>
          .
        </div>
      )}

      <form method="GET" className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by client, brand, role, location…"
          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
        >
          Search
        </button>
      </form>

      {error && <p className="text-sm text-red-400">Search failed: {error.message}</p>}

      {callSheets && callSheets.length === 0 && (
        <p className="text-sm text-neutral-500">
          {q ? "No call sheets match that search." : "No call sheets yet — trigger a sync from the Accounts page."}
        </p>
      )}

      <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
        {(callSheets ?? []).map((cs) => {
          const rate = formatRate(cs.day_rate, cs.rate_unit, cs.rate_currency);
          const title = [cs.client, cs.brand].filter(Boolean).join(" × ") || cs.project_name || "Untitled job";
          return (
            <li key={cs.id}>
              <Link href={`/call-sheets/${cs.id}`} className="block px-4 py-3 hover:bg-neutral-900">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{title}</p>
                    <p className="mt-0.5 truncate text-sm text-neutral-400">
                      {[cs.role, cs.location_name || cs.location_address].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="text-neutral-300">{formatDate(cs.shoot_date)}</p>
                    {rate && <p className="text-neutral-500">{rate}</p>}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
