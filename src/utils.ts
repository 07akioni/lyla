export function mergeUrl(
  baseUrl: string,
  relativeUrl: string
): string {
  return relativeUrl
    ? baseUrl.replace(/\/+$/, '') + '/' + relativeUrl.replace(/^\/+/, '')
    : baseUrl
}
