import { google } from "googleapis";
import { decrypt, encrypt } from "./crypto";
import { supabaseAdmin } from "./supabase";
import type { Tables, TablesUpdate } from "./database.types";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable`);
  return value;
}

export function createOAuthClient() {
  return new google.auth.OAuth2(
    getEnv("GOOGLE_CLIENT_ID"),
    getEnv("GOOGLE_CLIENT_SECRET"),
    getEnv("GOOGLE_REDIRECT_URI")
  );
}

/** Builds the consent URL the user is sent to in order to connect an inbox. */
export function buildAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // forces a refresh_token even on a re-connect
    scope: SCOPES,
    state,
  });
}

/** Exchanges an OAuth callback `code` for tokens. */
export async function exchangeCode(code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Revoke this app's access at " +
        "https://myaccount.google.com/permissions and reconnect so Google issues a fresh one."
    );
  }
  return tokens;
}

type GmailAccountRow = Tables<"gmail_accounts">;

/**
 * Returns an authenticated Gmail API client for a stored account. Any
 * refreshed access token is persisted back to Supabase so the next call
 * doesn't have to round-trip to Google's token endpoint.
 */
export function gmailClientForAccount(account: GmailAccountRow) {
  const client = createOAuthClient();
  client.setCredentials({
    refresh_token: decrypt(account.refresh_token_encrypted),
    access_token: account.access_token_encrypted ? decrypt(account.access_token_encrypted) : undefined,
    expiry_date: account.token_expiry ? new Date(account.token_expiry).getTime() : undefined,
  });

  client.on("tokens", (tokens) => {
    const update: TablesUpdate<"gmail_accounts"> = {};
    if (tokens.access_token) update.access_token_encrypted = encrypt(tokens.access_token);
    if (tokens.expiry_date) update.token_expiry = new Date(tokens.expiry_date).toISOString();
    if (Object.keys(update).length === 0) return;
    void (async () => {
      const { error } = await supabaseAdmin()
        .from("gmail_accounts")
        .update(update)
        .eq("id", account.id);
      if (error) console.error("Failed to persist refreshed Google token", error);
    })();
  });

  return google.gmail({ version: "v1", auth: client });
}
