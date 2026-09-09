# The Book

The Book turns your inbox into your career's permanent record — every call
sheet, contact, and shoot you've ever booked, automatically pulled and
organized into one searchable archive.

It connects to two Gmail inboxes (read-only), finds emails that look like
modeling call sheets or booking confirmations, extracts structured data
with Claude (date, client, rate, location, agency, contacts, usage terms,
...), and stores it in Supabase behind a search UI.

See **[SETUP.md](./SETUP.md)** for how to configure Google OAuth,
Supabase, and Claude API credentials, run it locally, and deploy it.

## Stack

- [Next.js](https://nextjs.org) (App Router, TypeScript, Tailwind)
- [Supabase](https://supabase.com) — Postgres + Storage
- [Google Gmail API](https://developers.google.com/gmail/api) (OAuth, read-only)
- [Claude API](https://docs.claude.com) (`claude-opus-5`, structured outputs) for extraction

## Development

```bash
npm install
npm run dev
```

See [SETUP.md](./SETUP.md) for required environment variables.
