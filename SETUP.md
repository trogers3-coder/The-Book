# Setting up The Book

The Book is a Next.js app that connects to your Gmail inboxes (read-only),
finds emails that look like modeling call sheets, pulls out structured data
with Claude, and stores it in Supabase so it's searchable. This doc covers
everything you need to configure to run it yourself — most of it is
one-time setup in Google Cloud and Supabase.

## Architecture at a glance

- **Next.js app** (this repo) — UI, OAuth flow, sync pipeline, API routes.
- **Supabase project** `mfazietajkocomqkjzsg` — Postgres database + private
  Storage bucket for attachment originals. Already has the schema applied
  (`supabase/migrations/`).
- **Google OAuth** — one Gmail connection per inbox, `gmail.readonly` scope
  only. Refresh tokens are encrypted (AES-256-GCM) before being stored.
- **Claude API** (`claude-opus-5`) — reads each candidate email/attachment
  and extracts structured fields (date, client, rate, location, contacts,
  etc.) via structured outputs. PDFs and images are sent to Claude directly
  (native document/vision support), so scanned call sheets work too.
- **Supabase Auth** gates sign-in to the app itself. There's a single user
  (you) — this is a personal tool for one person's two inboxes, not a
  multi-tenant product, so there's no public sign-up.

## 1. Google Cloud: OAuth client for Gmail

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and
   create a new project (or reuse one you control).
2. **APIs & Services → Library** → enable the **Gmail API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** (unless you have Google Workspace and want Internal).
   - Fill in app name ("The Book"), your email as support/developer contact.
   - Scopes: add `.../auth/gmail.readonly`.
   - **Test users**: add both Gmail addresses you'll connect. While the app
     is in "Testing" status, only listed test users can complete the OAuth
     flow — you don't need to submit for Google verification for personal use.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URIs — add both, so it works in dev and prod:
     - `http://localhost:3000/api/auth/google/callback`
     - `https://<your-deployed-domain>/api/auth/google/callback`
   - Save. Copy the **Client ID** and **Client Secret**.

## 2. Supabase Auth: create your account

The app itself is gated by a real Supabase Auth user rather than a shared
password. Create yours once:

1. Supabase dashboard → **Authentication → Users → Add user → Create new user**.
2. Enter your email and a password. Check **Auto Confirm User** (there's no
   email flow wired up, so an unconfirmed user can't sign in).

That's the account you'll sign in with at `/login`.

## 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from step 1.
- `GOOGLE_REDIRECT_URI` — `http://localhost:3000/api/auth/google/callback` for local dev.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — already
  filled in for project `mfazietajkocomqkjzsg` (these are public/publishable,
  safe to expose to the browser — that's what "anon" means here).
- `SUPABASE_URL` — already filled in, same project.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → Project Settings → API →
  `service_role` key (**not** the anon key — all of the app's own data access
  relies on the service role since every table has RLS enabled with no
  policies; the anon key is only used for the Auth sign-in flow).
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com/).
- `TOKEN_ENCRYPTION_KEY`, `CRON_SECRET` — generate random values, e.g.
  `openssl rand -base64 32` for each.

## 4. Run it locally

```bash
npm install   # already done if you're continuing from this session
npm run dev
```

Open `http://localhost:3000`, sign in with the email/password from step 2.

## 5. Connect both inboxes

Go to **Accounts** in the nav → **Connect Gmail** → sign in with the first
Gmail account and grant read-only access → you'll land back on Accounts
with it listed. Repeat for the second inbox.

If Google shows "This app isn't verified": that's expected while the OAuth
consent screen is in Testing status — click **Advanced → Go to The Book
(unsafe)**. It's your own app talking to your own Google Cloud project.

## 6. Run a sync

Click **Sync now** next to a connected account. Each run processes up to
`SYNC_MESSAGE_LIMIT` (default 25) new messages so it stays within request
time limits — for a first sync with years of history, click it repeatedly
(or wait for the cron job once deployed) until the summary says no more
are left to process. Extracted call sheets show up on the **Archive** page
immediately, searchable by client, brand, role, location, etc.

## 7. Deploy (Vercel)

1. Import this repo into Vercel.
2. Add every variable from `.env.local` as a Vercel **Environment Variable**
   (Production + Preview as needed). Update `GOOGLE_REDIRECT_URI` to your
   real domain, and add that same URL to the Google OAuth client's
   authorized redirect URIs (step 1). `NEXT_PUBLIC_*` variables get baked
   into the client bundle at build time — Vercel handles that automatically
   as long as they're set before you deploy.
3. `vercel.json` already defines a cron job hitting `/api/cron/sync` once
   daily at 6am UTC. Vercel automatically sends `Authorization: Bearer $CRON_SECRET`
   on requests to your Cron Jobs when a `CRON_SECRET` environment variable
   is set on the project — just make sure it's set. (If you deploy
   somewhere else, point any scheduler at `GET /api/cron/sync` with header
   `Authorization: Bearer <CRON_SECRET>`.)
4. Deploy. Reconnect both Gmail accounts against the production URL (OAuth
   tokens aren't shared between environments unless you copy the encrypted
   rows over — simplest is just to reconnect).

## Tuning

Everything in the "Optional tuning" section of `.env.example` has a
sensible default. Worth knowing about:

- `GMAIL_QUERY` — the heuristic used to find candidate emails. It's
  deliberately broad (recall over precision) because Claude does the real
  classification (`is_call_sheet`) afterward. Narrow it if sync is too slow
  or too noisy for your inbox.
- `CALL_SHEET_CONFIDENCE_THRESHOLD` — raise it if false positives show up
  in the archive; lower it if real call sheets are being skipped.

## Cost

Each candidate email/attachment is one Claude API call
(`claude-opus-5`, structured output). A typical sync of a few dozen
messages is a small fraction of a cent to a few cents depending on
attachment size — see [Anthropic's pricing](https://claude.com/pricing) if
you're syncing years of history at once.
