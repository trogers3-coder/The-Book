import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { syncAccount } from "@/lib/gmail-sync";

export const maxDuration = 300;

// Hit on a schedule (Vercel Cron or any external scheduler) rather than by
// a logged-in browser, so it authenticates via a bearer secret instead of
// the session cookie. middleware.ts leaves this path unprotected.
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: accounts, error } = await db.from("gmail_accounts").select("*");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];
  for (const account of accounts ?? []) {
    results.push(await syncAccount(account));
  }

  return NextResponse.json({ results });
}
