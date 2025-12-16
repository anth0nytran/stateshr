import { getCardBucketName, getPublicCardImageUrl } from "@/lib/supabase/urls";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function downloadCardImage(cardImagePath: string) {
  const bucket = getCardBucketName();
  const admin = getSupabaseAdminClient();

  if (admin) {
    const { data, error } = await admin.storage.from(bucket).download(cardImagePath);
    if (error || !data) {
      throw error ?? new Error("Failed to download card image from Storage");
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const publicUrl = getPublicCardImageUrl(cardImagePath);
  if (!publicUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");

  const res = await fetch(publicUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch card image (${res.status})`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

