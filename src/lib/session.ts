import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "book_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret(): string {
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) throw new Error("Missing APP_SESSION_SECRET environment variable");
  return secret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Creates a signed session token good for SESSION_TTL_MS from now. */
export function createSessionToken(): string {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `v1.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expiresRaw, signature] = parts;
  const payload = `${version}.${expiresRaw}`;
  const expected = sign(payload);
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return false;
  }
  const expires = Number(expiresRaw);
  return Number.isFinite(expires) && Date.now() < expires;
}

export function checkPassword(candidate: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("Missing APP_PASSWORD environment variable");
  const expectedBuf = Buffer.from(expected);
  const candidateBuf = Buffer.from(candidate);
  if (expectedBuf.length !== candidateBuf.length) return false;
  return timingSafeEqual(expectedBuf, candidateBuf);
}
