# Card Leads (MVP)
Mobile-first PWA for a staffing sales team:
- Scan a business card photo (camera or upload)
- OCR + OpenAI parsing into structured lead fields
- Review/edit with "uncertain" highlights
- Save leads to Supabase with pipeline stage
- Pipeline view with stage filters, export CSV/XLSX, and Google Sheets sync

## 1) Setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000/scan`.

## 2) Supabase (DB + Storage)
This repo includes SQL migrations:
- `supabase/migrations/0001_init.sql` (tables, stages seed, Storage bucket + public policies)
- `supabase/migrations/0002_dedupe_and_status.sql` (dedupe + lead status)

Apply them in Supabase:
1) Supabase Dashboard -> SQL Editor -> New query
2) Paste `supabase/migrations/0001_init.sql` and run
3) Paste `supabase/migrations/0002_dedupe_and_status.sql` and run

Notes:
- `0002_dedupe_and_status.sql` removes existing duplicates (keeps the most recently updated row per dedupe key) and enforces uniqueness going forward.
- Storage is public for MVP speed. TODO: tighten with Auth + RLS for production.

## 3) Google Vision (OCR)
1) Create a Google Cloud service account
2) Enable the Cloud Vision API
3) Create a JSON key
4) Put the full JSON as a single-line string in `GOOGLE_VISION_CREDENTIALS_JSON`

## 4) OpenAI (LLM parsing)
Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`).

## 5) Google Sheets Sync
1) Enable Google Sheets API in your Google project
2) Create a service account JSON key
3) Share the target spreadsheet with the service account email (`client_email`)
4) Set:
   - `GOOGLE_SHEETS_CREDENTIALS_JSON`
   - `GOOGLE_SHEETS_SPREADSHEET_ID`
   - `GOOGLE_SHEETS_TAB_NAME`

Sync overwrites the target tab each time with the required header + rows.

## 6) Deploy (Vercel)
- Framework: Next.js (App Router)
- Add the same env vars in Vercel Project Settings
- Route handlers run in Node.js (required for Google APIs)

## 7) Demo Mode (no external keys)
Set `NEXT_PUBLIC_DEMO_MODE=1` to bypass Supabase + Google Vision + OpenAI and run the full UI flow locally with deterministic extraction.

