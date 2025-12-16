import { googleVisionOcr } from "@/lib/ocr/providers/google-vision";

const MOCK_OCR_TEXT = `Jane Doe
Senior Recruiter
Acme Staffing
jane.doe@acmestaffing.com
(555) 123-4567
acmestaffing.com
123 Main St, Austin, TX 78701`;

export async function ocrBusinessCard(imageBytes: Buffer) {
  // Optional deterministic OCR for local testing (server-side only).
  if (process.env.OCR_PROVIDER === "mock") {
    return MOCK_OCR_TEXT;
  }

  return googleVisionOcr(imageBytes);
}
