import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/google";
import { STATE_COOKIE } from "@/lib/oauth-state";

// Kicks off the "connect a Gmail inbox" flow. The user hits this by
// clicking "Connect Gmail" on /accounts; we redirect to Google's consent
// screen and stash a random state value in a short-lived cookie to check
// against on the way back (CSRF protection for the OAuth callback).
export async function GET() {
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(buildAuthUrl(state));
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}
