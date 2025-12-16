import { NextResponse } from "next/server";
import { z } from "zod";

import type { LeadDraft } from "@/lib/types";
import { downloadCardImage } from "@/lib/supabase/storage";
import { ocrBusinessCard } from "@/lib/ocr";
import { parseLeadFromOcrText } from "@/lib/openai/lead-parser";
import { normalizeAndValidateDraft } from "@/lib/validation";

export const runtime = "nodejs";

const BodySchema = z.object({
  card_image_path: z.string().min(1),
});

function emptyDraft(cardImagePath: string): LeadDraft {
  return {
    full_name: "",
    first_name: "",
    last_name: "",
    company: "",
    title: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    notes: "",
    stage_id: null,
    card_image_path: cardImagePath,
  };
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { extracted: emptyDraft(""), uncertain_fields: [], raw_ocr_text: "", error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { card_image_path } = parsed.data;

  let raw_ocr_text = "";
  let extracted: LeadDraft = emptyDraft(card_image_path);
  let uncertain_fields: string[] = [];
  let error: string | null = null;

  try {
    const imageBytes = await downloadCardImage(card_image_path);

    raw_ocr_text = await ocrBusinessCard(imageBytes);

    const parsedLead = await parseLeadFromOcrText(raw_ocr_text);
    extracted = { ...extracted, ...parsedLead };

    const validated = normalizeAndValidateDraft(extracted);
    extracted = validated.lead;
    uncertain_fields = validated.uncertain_fields;
  } catch (err) {
    // Allow manual review/save even if extraction fails.
    uncertain_fields = ["full_name", "company", "email", "phone"];
    error = err instanceof Error ? err.message : "Extraction failed";
  }

  return NextResponse.json({ extracted, uncertain_fields, raw_ocr_text, error });
}
