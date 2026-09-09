import { supabaseAdmin } from "@/lib/supabase";
import { AccountRow } from "@/components/AccountRow";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  const params = await searchParams;
  const connected = firstParam(params.connected);
  const error = firstParam(params.error);

  const db = supabaseAdmin();
  const [{ data: accounts }, { data: recentRuns }] = await Promise.all([
    db.from("gmail_accounts").select("*").order("created_at", { ascending: true }),
    db
      .from("sync_runs")
      .select("*, gmail_accounts(email)")
      .order("started_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Connected inboxes</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Connect the Gmail inboxes you book jobs through. Only messages that look like call sheets are
          pulled in — nothing else in your inbox is touched.
        </p>
      </div>

      {connected && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-3 text-sm text-emerald-200">
          Connected {connected}.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">
          Couldn&apos;t connect: {error}
        </div>
      )}

      <a
        href="/api/auth/google/start"
        className="inline-block rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-white"
      >
        Connect Gmail
      </a>

      <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800">
        {(accounts ?? []).map((account) => (
          <AccountRow key={account.id} account={account} />
        ))}
        {(accounts ?? []).length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-neutral-500">No inboxes connected yet.</li>
        )}
      </ul>

      <div>
        <h2 className="text-lg font-semibold">Recent sync activity</h2>
        <ul className="mt-2 divide-y divide-neutral-800 rounded-lg border border-neutral-800 text-sm">
          {(recentRuns ?? []).map((run) => (
            <li key={run.id} className="flex items-center justify-between px-4 py-2">
              <span className="text-neutral-300">
                {(run.gmail_accounts as unknown as { email?: string } | null)?.email ?? "Unknown account"} —{" "}
                {new Date(run.started_at).toLocaleString()}
              </span>
              <span className="text-neutral-500">
                {run.status}
                {run.status === "completed" &&
                  ` · ${run.messages_processed} processed, ${run.call_sheets_extracted} extracted`}
                {run.status === "failed" && run.error ? `: ${run.error}` : ""}
              </span>
            </li>
          ))}
          {(recentRuns ?? []).length === 0 && (
            <li className="px-4 py-4 text-center text-neutral-500">No syncs yet.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
