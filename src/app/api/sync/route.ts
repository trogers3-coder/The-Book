import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { syncAccount } from "@/lib/gmail-sync";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let accountId: string | undefined;
  try {
    const body = await request.json();
    accountId = typeof body?.accountId === "string" ? body.accountId : undefined;
  } catch {
    // no body - sync every account
  }

  const db = supabaseAdmin();
  const query = db.from("gmail_accounts").select("*");
  const { data: accounts, error } = accountId ? await query.eq("id", accountId) : await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!accounts || accounts.length === 0) {
    return NextResponse.json({ error: "No connected accounts" }, { status: 404 });
  }

  const results = [];
  for (const account of accounts) {
    results.push(await syncAccount(account));
  }

  return NextResponse.json({ results });
}
