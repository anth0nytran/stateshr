import { ImageAnnotatorClient } from "@google-cloud/vision";

let visionClient: ImageAnnotatorClient | null = null;

function getVisionClient() {
  if (visionClient) return visionClient;

  const json = process.env.GOOGLE_VISION_CREDENTIALS_JSON;
  if (json) {
    const credentials = JSON.parse(json) as {
      client_email: string;
      private_key: string;
      project_id?: string;
    };
    visionClient = new ImageAnnotatorClient({ credentials });
    return visionClient;
  }

  visionClient = new ImageAnnotatorClient();
  return visionClient;
}

export async function googleVisionOcr(imageBytes: Buffer) {
  const client = getVisionClient();
  // Business cards work significantly better with DOCUMENT_TEXT_DETECTION (layout-aware).
  // We'll fall back to basic text detection if needed.
  const [docResult] = await client.documentTextDetection({
    image: { content: imageBytes },
    imageContext: { languageHints: ["en"] },
  });

  const docText = docResult.fullTextAnnotation?.text?.trim();
  if (docText) return docText;

  const [textResult] = await client.textDetection({
    image: { content: imageBytes },
    imageContext: { languageHints: ["en"] },
  });

  const primary = textResult.textAnnotations?.[0]?.description?.trim();
  if (primary) return primary;

  const full = textResult.fullTextAnnotation?.text?.trim();
  return full ?? "";
}

