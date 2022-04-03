import { LylaRequestHeaders } from './types'

export function mergeUrl(baseUrl: string, relativeUrl: string): string {
  if (isAbsoluteUrl(relativeUrl)) {
    return relativeUrl
  }
  return relativeUrl
    ? baseUrl.replace(/\/+$/, '') + '/' + relativeUrl.replace(/^\/+/, '')
    : baseUrl
}

function isAbsoluteUrl(url: string): boolean {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url)
}

function isObject(value: any): value is object {
  return value && typeof value === 'object'
}

export function mergeHeaders(
  target: Headers,
  source: LylaRequestHeaders | undefined
): void {
  if (!source) return
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) {
      target.delete(key)
    } else {
      target.set(key, value as string)
    }
  }
}

export function mergeOptions<T>(...sources: Array<Partial<T> | undefined>): T {
  let merged: any = {}
  for (const source of sources) {
    if (Array.isArray(source)) {
      if (!Array.isArray(merged)) {
        merged = []
      }
      merged = merged.push(...source)
    } else if (isObject(source)) {
      for (let [key, value] of Object.entries(source)) {
        if (isObject(value) && key in merged) {
          value = mergeOptions(merged[key], value)
        }
        merged[key] = value
      }
    }
  }
  return merged
}
