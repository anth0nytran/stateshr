import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

import type { LeadDraft } from "@/lib/types";

const LeadExtractSchema = z.object({
  full_name: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

function normalizeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function parseLeadFromOcrText(ocrText: string): Promise<
  Pick<
    LeadDraft,
    | "full_name"
    | "first_name"
    | "last_name"
    | "company"
    | "title"
    | "email"
    | "phone"
    | "website"
    | "address"
  >
> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return heuristicParse(ocrText);

  const client = new OpenAI({ apiKey });

  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0,
    instructions: [
      "You extract contact info from business-card OCR text.",
      "Do not guess or hallucinate. If a field is missing, return null for that field.",
      "Return ONLY the JSON fields from the schema; no extra keys.",
      "Keep the original spelling/casing from the OCR when possible.",
    ].join("\n"),
    input: ocrText,
    text: { format: zodTextFormat(LeadExtractSchema, "lead_extract") },
  });

  const parsed = response.output_parsed;
  if (!parsed) return heuristicParse(ocrText);

  return {
    full_name: normalizeString(parsed.full_name),
    first_name: normalizeString(parsed.first_name),
    last_name: normalizeString(parsed.last_name),
    company: normalizeString(parsed.company),
    title: normalizeString(parsed.title),
    email: normalizeString(parsed.email),
    phone: normalizeString(parsed.phone),
    website: normalizeString(parsed.website),
    address: normalizeString(parsed.address),
  };
}

function heuristicParse(ocrText: string) {
  const text = ocrText ?? "";
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch =
    text.match(/(\+?\d[\d(). -]{7,}\d)/) ?? text.match(/(\(\d{3}\)\s*\d{3}-\d{4})/);
  const websiteMatch = text.match(
    /\b((https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,})(\/\S*)?\b/i
  );

  const fullName = lines[0] ?? "";
  const title = lines[1] ?? "";
  const company = lines[2] ?? "";

  const [first_name, ...rest] = fullName.split(/\s+/);
  const last_name = rest.join(" ");

  return {
    full_name: fullName,
    first_name: first_name ?? "",
    last_name,
    company,
    title,
    email: emailMatch?.[0] ?? "",
    phone: phoneMatch?.[0] ?? "",
    website: websiteMatch?.[0] ?? "",
    address: "",
  };
}
