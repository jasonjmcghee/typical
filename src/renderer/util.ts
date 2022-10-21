export function buildUrl(url: string) {
  if (!url.includes('://')) {
    return `https://${url}`;
  }
  return url;
}
