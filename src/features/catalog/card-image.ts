// Shared, framework-agnostic helper for deciding whether a stored card image
// URL is actually renderable. Kept in a plain module (no 'use client') so it can
// be called from both Server and Client Components.
//
// Only some cards have real art saved in Supabase Storage. The rest still carry
// a legacy `image_url` that points at a Heroku *search page* (HTML, not an
// image) or the `/file.svg` placeholder, which would render as a broken image or
// a generic document icon. Treat those as "no image".
export function isRenderableCardImage(
  url: string | null | undefined,
): url is string {
  if (!url) {
    return false;
  }
  if (url.includes('herokuapp.com')) {
    return false;
  }
  return !url.endsWith('/file.svg');
}
