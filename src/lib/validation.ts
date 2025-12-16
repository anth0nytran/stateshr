import { parsePhoneNumberFromString } from "libphonenumber-js";

import type { LeadDraft } from "@/lib/types";

function isValidEmail(email: string) {
  const e = email.trim();
  if (!e) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isProbablyUrl(value: string) {
  const v = value.trim();
  if (!v) return true;
  try {
    // Allow bare domains by validating with a temporary scheme.
    // Do not rewrite the stored value here.
    new URL(v.startsWith("http://") || v.startsWith("https://") ? v : `https://${v}`);
    return true;
  } catch {
    return false;
  }
}

export function normalizeAndValidateDraft(draft: LeadDraft) {
  const normalized: LeadDraft = {
    ...draft,
    full_name: draft.full_name.trim(),
    first_name: draft.first_name.trim(),
    last_name: draft.last_name.trim(),
    company: draft.company.trim(),
    title: draft.title.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    website: draft.website.trim(),
    address: draft.address.trim(),
    notes: draft.notes ?? "",
  };

  if (!normalized.full_name) {
    const combined = [normalized.first_name, normalized.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (combined) normalized.full_name = combined;
  }

  if ((!normalized.first_name || !normalized.last_name) && normalized.full_name) {
    const parts = normalized.full_name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      normalized.first_name ||= parts[0] ?? "";
      normalized.last_name ||= parts.slice(1).join(" ");
    }
  }

  const uncertain_fields: string[] = [];

  if (normalized.full_name && normalized.full_name.split(/\s+/).length === 1) {
    uncertain_fields.push("full_name");
  }

  if (normalized.email && !isValidEmail(normalized.email)) {
    uncertain_fields.push("email");
  }

  if (normalized.phone) {
    const pn = parsePhoneNumberFromString(normalized.phone, "US");
    if (!pn || !pn.isValid()) {
      uncertain_fields.push("phone");
    }
  }

  if (normalized.website && !isProbablyUrl(normalized.website)) {
    uncertain_fields.push("website");
  }

  return { lead: normalized, uncertain_fields };
}
