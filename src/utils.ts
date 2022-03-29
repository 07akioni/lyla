export function mergeUrl(
  baseUrl: string | undefined,
  relativeUrl: string
): string {
  return relativeUrl
    ? baseUrl.replace(/\/+$/, '') + '/' + relativeUrl.replace(/^\/+/, '')
    : baseUrl
}
