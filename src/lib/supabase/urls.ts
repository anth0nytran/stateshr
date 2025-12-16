const CARD_BUCKET = "card-images";

export function getPublicCardImageUrl(cardImagePath: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return null;
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = cardImagePath.replace(/^\/+/, "");
  return `${cleanBase}/storage/v1/object/public/${CARD_BUCKET}/${cleanPath}`;
}

export function getCardBucketName() {
  return CARD_BUCKET;
}

