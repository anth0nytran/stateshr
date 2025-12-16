import type { LeadDraft, LeadRow, LeadStatus, PipelineStage } from "@/lib/types";
import { buildLeadDedupeKey } from "@/lib/dedupe";

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}

export const DEMO_STAGES: PipelineStage[] = [
  { id: "prospecting", name: "Prospecting", sort_order: 1 },
  { id: "appointment", name: "Appointment", sort_order: 2 },
  { id: "met", name: "Met", sort_order: 3 },
  { id: "sent-loe", name: "Sent LOE/Contract", sort_order: 4 },
  { id: "closed", name: "Under Contract/Closed", sort_order: 5 },
];

const LEADS_KEY = "cardleads.demo.leads";

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function demoLoadLeads(): LeadRow[] {
  if (typeof window === "undefined") return [];
  return safeParse<LeadRow[]>(window.localStorage.getItem(LEADS_KEY), []);
}

export function demoSaveLead(lead: LeadDraft, rawOcrText: string): LeadRow[] {
  if (typeof window === "undefined") return [];
  const now = new Date().toISOString();
  const nextExisting = demoLoadLeads();

  const key = buildLeadDedupeKey(lead);
  if (key) {
    const dupe = nextExisting.find((l) => {
      const k = buildLeadDedupeKey({
        email: l.email ?? "",
        phone: l.phone ?? "",
        full_name: l.full_name ?? "",
        first_name: l.first_name ?? "",
        last_name: l.last_name ?? "",
        company: l.company ?? "",
      });
      return k === key;
    });
    if (dupe) return nextExisting;
  }

  const row: LeadRow = {
    ...lead,
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    raw_ocr_text: rawOcrText,
    status: "active",
    created_at: now,
    updated_at: now,
  };
  const next = [row, ...nextExisting];
  window.localStorage.setItem(LEADS_KEY, JSON.stringify(next));
  return next;
}

export function demoUpdateLeadStage(leadId: string, stageId: string): LeadRow[] {
  if (typeof window === "undefined") return [];
  const next = demoLoadLeads().map((l) =>
    l.id === leadId ? { ...l, stage_id: stageId, updated_at: new Date().toISOString() } : l
  );
  window.localStorage.setItem(LEADS_KEY, JSON.stringify(next));
  return next;
}

export function demoUpdateLeadStatus(leadId: string, status: LeadStatus): LeadRow[] {
  if (typeof window === "undefined") return [];
  const next = demoLoadLeads().map((l) =>
    l.id === leadId ? { ...l, status, updated_at: new Date().toISOString() } : l
  );
  window.localStorage.setItem(LEADS_KEY, JSON.stringify(next));
  return next;
}
