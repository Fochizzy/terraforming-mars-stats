export function isRenderableCardImage(
  url: string | null | undefined,
): url is string {
  if (!url) {
    return false;
  }

  return !url.includes('herokuapp.com') && !url.endsWith('/file.svg');
}
