import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/accounts/[id]">) {
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin().from("gmail_accounts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
