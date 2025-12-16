import { NextResponse } from "next/server";
import { z } from "zod";
import { google } from "googleapis";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildLeadDedupeKey } from "@/lib/dedupe";

export const runtime = "nodejs";

const BodySchema = z
  .object({
    stage_id: z.string().optional(),
  })
  .optional();

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toA1Range(sheetName: string, range: string) {
  const escaped = sheetName.replace(/'/g, "''");
  return `'${escaped}'!${range}`;
}

async function ensureSheetTabExists(args: {
  sheets: ReturnType<typeof google.sheets>;
  spreadsheetId: string;
  sheetName: string;
}) {
  const { sheets, spreadsheetId, sheetName } = args;
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title))",
  });

  const titles =
    meta.data.sheets
      ?.map((s) => s.properties?.title)
      .filter((t): t is string => Boolean(t)) ?? [];

  if (titles.includes(sheetName)) return { created: false, titles };

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ addSheet: { properties: { title: sheetName } } }],
    },
  });

  return { created: true, titles };
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  if (process.env.SHEETS_SYNC_TOKEN) {
    const token = req.headers.get("x-sync-token");
    if (token !== process.env.SHEETS_SYNC_TOKEN) {
      return NextResponse.json({ success: false }, { status: 401 });
    }
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEETS_TAB_NAME;
  const credJson = process.env.GOOGLE_SHEETS_CREDENTIALS_JSON;
  if (!spreadsheetId || !sheetName || !credJson) {
    return NextResponse.json(
      { success: false, message: "Missing Google Sheets env vars" },
      { status: 500 }
    );
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { success: false, message: "Missing Supabase env vars" },
      { status: 500 }
    );
  }

  const stageId = parsed.data?.stage_id;

  const { data: stages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .select("id,name,sort_order")
    .order("sort_order", { ascending: true });

  if (stagesError) {
    return NextResponse.json(
      { success: false, message: stagesError.message },
      { status: 500 }
    );
  }

  const stageNameById = new Map<string, string>(
    (stages ?? []).map((s) => [s.id as string, s.name as string])
  );

  let leadsQuery = supabase
    .from("leads")
    .select(
      "full_name,first_name,last_name,company,title,email,phone,website,address,stage_id,notes,created_at"
    )
    .order("created_at", { ascending: false });

  if (stageId) leadsQuery = leadsQuery.eq("stage_id", stageId);

  const { data: leads, error: leadsError } = await leadsQuery;
  if (leadsError) {
    return NextResponse.json(
      { success: false, message: leadsError.message },
      { status: 500 }
    );
  }

  // Remove duplicates before writing (keep newest first).
  const dedupedLeads = (() => {
    const out: typeof leads = [];
    const seen = new Set<string>();
    for (const l of leads ?? []) {
      const key = buildLeadDedupeKey({
        email: (l.email as string | null) ?? "",
        phone: (l.phone as string | null) ?? "",
        full_name: (l.full_name as string | null) ?? "",
        first_name: (l.first_name as string | null) ?? "",
        last_name: (l.last_name as string | null) ?? "",
        company: (l.company as string | null) ?? "",
      });
      if (!key) {
        out.push(l);
        continue;
      }
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(l);
    }
    return out;
  })();

  const header = [
    "Full Name",
    "First Name",
    "Last Name",
    "Company",
    "Title",
    "Email",
    "Phone",
    "Website",
    "Address",
    "Stage",
    "Notes",
    "Date Added",
    "Source",
  ];

  const rows =
    dedupedLeads?.map((l) => [
      l.full_name ?? "",
      l.first_name ?? "",
      l.last_name ?? "",
      l.company ?? "",
      l.title ?? "",
      l.email ?? "",
      l.phone ?? "",
      l.website ?? "",
      l.address ?? "",
      stageNameById.get(l.stage_id as string) ?? "",
      l.notes ?? "",
      formatDate(l.created_at as string),
      "Business Card",
    ]) ?? [];

  let credentials: { client_email: string; private_key: string };
  try {
    credentials = JSON.parse(credJson) as { client_email: string; private_key: string };
  } catch {
    return NextResponse.json(
      {
        success: false,
        message:
          "Invalid GOOGLE_SHEETS_CREDENTIALS_JSON (must be valid JSON). If you're using .env, wrap the JSON in single quotes.",
      },
      { status: 500 }
    );
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    // spreadsheets scope is enough *if* the spreadsheet is shared with the service account.
    // drive.file can help with some edge cases depending on how the sheet is managed.
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });

  const sheets = google.sheets({ version: "v4", auth });

  try {
    await ensureSheetTabExists({ sheets, spreadsheetId, sheetName });

    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: toA1Range(sheetName, "A:Z"),
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: toA1Range(sheetName, "A1"),
      valueInputOption: "RAW",
      requestBody: { values: [header, ...rows] },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Google Sheets sync failed";
    const hint =
      msg.includes("The caller does not have permission") || msg.includes("PERMISSION_DENIED")
        ? `Share the spreadsheet with this service account email: ${credentials.client_email}`
        : msg.includes("Unable to parse range")
          ? `Confirm the tab name matches exactly: GOOGLE_SHEETS_TAB_NAME="${sheetName}"`
        : msg.includes("insufficient authentication scopes")
          ? "OAuth scopes are insufficient. Ensure Sheets API is enabled and scopes include spreadsheets."
          : undefined;

    return NextResponse.json(
      {
        success: false,
        message: hint ? `${msg}. ${hint}` : msg,
        service_account: credentials.client_email,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, rows_written: rows.length });
}
