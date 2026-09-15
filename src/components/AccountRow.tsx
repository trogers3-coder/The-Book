"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Tables } from "@/lib/database.types";

type SyncSummary = {
  accountEmail: string;
  messagesFound: number;
  messagesProcessed: number;
  callSheetsExtracted: number;
  reachedEnd: boolean;
  error?: string;
};

export function AccountRow({ account }: { account: Tables<"gmail_accounts"> }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);
  const [result, setResult] = useState<SyncSummary | { error: string } | null>(null);

  async function handleSync() {
    setBusy("sync");
    setResult(null);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: account.id }),
      });
      const data = await res.json();
      const summary: SyncSummary | undefined = data.results?.[0];
      setResult(summary ?? { error: data.error ?? "Sync failed" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${account.email}? Its synced call sheets stay in the archive.`)) return;
    setBusy("disconnect");
    try {
      await fetch(`/api/accounts/${account.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-medium">{account.email}</p>
          <p className="text-xs text-neutral-500">
            {account.last_synced_at
              ? `Last synced ${new Date(account.last_synced_at).toLocaleString()}`
              : "Never synced"}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={handleSync}
            disabled={busy !== null}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm hover:border-neutral-400 disabled:opacity-50"
          >
            {busy === "sync" ? "Syncing…" : "Sync now"}
          </button>
          <button
            onClick={handleDisconnect}
            disabled={busy !== null}
            className="rounded-md border border-neutral-800 px-3 py-1.5 text-sm text-red-400 hover:border-red-800 disabled:opacity-50"
          >
            {busy === "disconnect" ? "Removing…" : "Disconnect"}
          </button>
        </div>
      </div>
      {result && (
        <p className="mt-2 text-xs text-neutral-400">
          {"messagesFound" in result
            ? `Found ${result.messagesFound}, processed ${result.messagesProcessed}, extracted ${result.callSheetsExtracted} call sheet(s)${
                result.reachedEnd ? "" : " — more to sync, run again"
              }.${result.error ? ` (error: ${result.error})` : ""}`
            : `Error: ${result.error}`}
        </p>
      )}
    </li>
  );
}
