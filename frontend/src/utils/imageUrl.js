export function optimizePublicSupabaseImageUrl(
  src,
  width = 900,
  quality = 75
) {
  if (typeof src !== "string" || !src) {
    return src;
  }

  try {
    const url = new URL(src);
    const originalPath = "/storage/v1/object/public/";
    const transformedPath = "/storage/v1/render/image/public/";

    // Only transform standard public Supabase Storage URLs.
    // Leave external URLs and signed URLs unchanged.
    if (!url.pathname.includes(originalPath)) {
      return src;
    }

    url.pathname = url.pathname.replace(
      originalPath,
      transformedPath
    );

    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", String(quality));

    return url.toString();
  } catch {
    return src;
  }
}
