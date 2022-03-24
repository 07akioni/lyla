export function validateBaseUrl(baseUrl: string | undefined): void {
  if (!baseUrl) return
  if (!baseUrl.endsWith('/')) throw new TypeError("baseUrl should end with '/'")
}
