// @vitest-environment node
import { adapter as xhrAdapter } from '@lylajs/web-xhr'
import { adapter as fetchAdapter } from '@lylajs/web-fetch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { headerFixtures, type HeaderFixture } from '../fixtures/response-headers'

class HeaderXMLHttpRequest {
  static rawHeaders = ''
  readonly HEADERS_RECEIVED = 2
  readyState = 1
  status = 200
  response = ''
  responseType = ''
  withCredentials = false
  upload = { addEventListener() {} }
  private listeners: Record<string, Array<() => void>> = {}
  open() {}
  setRequestHeader() {}
  abort() {}
  getAllResponseHeaders() { return HeaderXMLHttpRequest.rawHeaders }
  addEventListener(type: string, listener: () => void) {
    ;(this.listeners[type] ??= []).push(listener)
  }
  removeEventListener(type: string, listener: () => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((item) => item !== listener)
  }
  send() {
    queueMicrotask(() => {
      for (const readyState of [2, 3, 3, 4]) {
        this.readyState = readyState
        for (const listener of [...(this.listeners.readystatechange ?? [])]) listener()
      }
      for (const listener of this.listeners.loadend ?? []) listener()
    })
  }
}

beforeEach(() => vi.stubGlobal('XMLHttpRequest', HeaderXMLHttpRequest))
afterEach(() => vi.unstubAllGlobals())

async function readHeaders(api: 'xhr' | 'fetch', fixture: HeaderFixture, withHook: boolean) {
  const response = new Response(null)
  for (const [name, value] of fixture.fields) response.headers.append(name, value)
  // getAllResponseHeaders() serializes names and values already combined by the
  // browser. Wire-level repeated fields are covered separately in browser tests.
  HeaderXMLHttpRequest.rawHeaders = Array.from(response.headers)
    .map(([name, value]) => `${name}: ${value}\r\n`).join('')
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
  const events: string[] = []
  const received: Array<Record<string, string>> = []
  const headers = await new Promise<Record<string, string>>((resolve, reject) => {
    const options = {
      url: 'https://example.com/',
      method: 'GET' as const,
      body: undefined,
      json: undefined,
      headers: {},
      responseType: 'text' as const,
      withCredentials: false,
      extraOptions: undefined as never,
      onUploadProgress: undefined,
      onDownloadProgress: undefined,
      onHeadersReceived: withHook ? (headers: Record<string, string>) => {
        events.push('headers')
        received.push(headers)
      } : undefined,
      onResponse: (response: { headers: Record<string, string> }) => {
        events.push('response')
        resolve(response.headers)
      },
      onNetworkError: (detail: unknown, error: Error | undefined) => reject(error ?? detail)
    }
    if (api === 'xhr') xhrAdapter(options)
    else fetchAdapter(options)
  })
  return { headers, events, received }
}

for (const withHook of [true, false]) {
  describe(`raw adapter response headers, onHeadersReceived=${withHook}`, () => {
    it.each(headerFixtures)('$name', async (fixture) => {
      const xhr = await readHeaders('xhr', fixture, withHook)
      const fetch = await readHeaders('fetch', fixture, withHook)
      for (const result of [xhr, fetch]) {
        expect(result.headers).toEqual(fixture.expected)
        expect(Object.keys(result.headers).sort()).toEqual(Object.keys(fixture.expected).sort())
        expect(result.received).toEqual(withHook ? [fixture.expected] : [])
        expect(result.events).toEqual(withHook ? ['headers', 'response'] : ['response'])
      }
      expect(xhr.headers).toEqual(fetch.headers)
    })
  })
}
