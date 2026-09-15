import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { createOAuthClient, exchangeCode } from "@/lib/google";
import { encrypt } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { STATE_COOKIE } from "@/lib/oauth-state";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const error = url.searchParams.get("error");
  const accountsUrl = new URL("/accounts", request.url);

  if (error) {
    accountsUrl.searchParams.set("error", error);
    return NextResponse.redirect(accountsUrl);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    accountsUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(accountsUrl);
  }

  try {
    const tokens = await exchangeCode(code);

    const client = createOAuthClient();
    client.setCredentials(tokens);
    const { data: profile } = await google.gmail({ version: "v1", auth: client }).users.getProfile({
      userId: "me",
    });
    if (!profile.emailAddress) throw new Error("Google did not return an email address");

    const { error: dbError } = await supabaseAdmin()
      .from("gmail_accounts")
      .upsert(
        {
          email: profile.emailAddress,
          refresh_token_encrypted: encrypt(tokens.refresh_token!),
          access_token_encrypted: tokens.access_token ? encrypt(tokens.access_token) : null,
          token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        },
        { onConflict: "email" }
      );
    if (dbError) throw dbError;

    accountsUrl.searchParams.set("connected", profile.emailAddress);
  } catch (err) {
    console.error("Google OAuth callback failed", err);
    accountsUrl.searchParams.set("error", "connect_failed");
  }

  const response = NextResponse.redirect(accountsUrl);
  response.cookies.delete(STATE_COOKIE);
  return response;
}
