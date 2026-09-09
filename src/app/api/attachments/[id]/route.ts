import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const ATTACHMENTS_BUCKET = "call-sheet-attachments";

export async function GET(_request: Request, ctx: RouteContext<"/api/attachments/[id]">) {
  const { id } = await ctx.params;
  const db = supabaseAdmin();

  const { data: attachment, error } = await db.from("attachments").select("*").eq("id", id).single();
  if (error || !attachment?.storage_path) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }

  const { data: signed, error: signError } = await db.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(attachment.storage_path, 60, {
      download: attachment.filename ?? undefined,
    });
  if (signError || !signed) {
    return NextResponse.json({ error: "Could not generate download link" }, { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl);
}
