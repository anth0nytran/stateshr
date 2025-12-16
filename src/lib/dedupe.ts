import type { LeadDraft, LeadRow } from "@/lib/types";

function normalizeSpaces(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeEmail(email: string | null | undefined) {
  const e = (email ?? "").trim().toLowerCase();
  return e ? e : null;
}

export function normalizePhoneDigits(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/[^0-9]/g, "");
  return digits ? digits : null;
}

export function normalizeName(name: string | null | undefined) {
  const n = normalizeSpaces(name ?? "").toLowerCase();
  return n ? n : null;
}

export function normalizeCompany(company: string | null | undefined) {
  const c = normalizeSpaces(company ?? "").toLowerCase();
  return c ? c : null;
}

// Matches the dedupe strategy in `supabase/migrations/0002_dedupe_and_status.sql`.
export function buildLeadDedupeKey(lead: Pick<
  LeadDraft,
  "email" | "phone" | "full_name" | "first_name" | "last_name" | "company"
>) {
  const email = normalizeEmail(lead.email);
  if (email) return `email:${email}`;

  const phoneDigits = normalizePhoneDigits(lead.phone);
  const fullName =
    normalizeName(lead.full_name) ??
    normalizeName([lead.first_name, lead.last_name].filter(Boolean).join(" "));

  if (phoneDigits && fullName) return `phone_name:${phoneDigits}|${fullName}`;

  const company = normalizeCompany(lead.company);
  if (fullName && company) return `name_company:${fullName}|${company}`;

  return null;
}

export function dedupeLeadRows(list: LeadRow[]) {
  // Keep the most recently updated row per dedupe key.
  const sorted = [...list].sort((a, b) => {
    const aTime = new Date(a.updated_at ?? a.created_at).getTime();
    const bTime = new Date(b.updated_at ?? b.created_at).getTime();
    return bTime - aTime;
  });

  const seen = new Set<string>();
  const out: LeadRow[] = [];

  for (const lead of sorted) {
    const key = buildLeadDedupeKey({
      email: lead.email ?? "",
      phone: lead.phone ?? "",
      full_name: lead.full_name ?? "",
      first_name: lead.first_name ?? "",
      last_name: lead.last_name ?? "",
      company: lead.company ?? "",
    });

    if (!key) {
      out.push(lead);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(lead);
  }

  // Restore newest-first ordering for UI consistency.
  out.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return out;
}

