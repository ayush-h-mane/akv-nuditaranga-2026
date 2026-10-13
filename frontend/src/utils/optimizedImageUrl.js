import { optimizePublicSupabaseImageUrl } from "./imageUrl";

export function getOptimizedImageUrl(
  imageUrl,
  { width = 900, quality = 75 } = {}
) {
  return optimizePublicSupabaseImageUrl(imageUrl, width, quality);
}

export { optimizePublicSupabaseImageUrl };
