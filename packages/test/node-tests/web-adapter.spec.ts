// @vitest-environment node
import { createLyla } from '@lylajs/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

class FakeXMLHttpRequest {
  static rawHeaders = ''
  readonly HEADERS_RECEIVED = 2
  readyState = 1
  status = 200
  response = ''
  responseType = ''
  withCredentials = false
  upload = { addEventListener() {} }
  private listeners: Record<string, Array<(event: unknown) => void>> = {}
  open() {}
  setRequestHeader() {}
  abort() {}
  addEventListener(type: string, listener: (event: unknown) => void) {
    ;(this.listeners[type] ??= []).push(listener)
  }
  removeEventListener(type: string, listener: (event: unknown) => void) {
    this.listeners[type] = (this.listeners[type] ?? []).filter(
      (l) => l !== listener
    )
  }
  getAllResponseHeaders() {
    return FakeXMLHttpRequest.rawHeaders
  }
  send() {
    setTimeout(() => {
      this.readyState = this.HEADERS_RECEIVED
      this.dispatch('readystatechange')
      this.readyState = 4
      this.dispatch('loadend')
    })
  }
  private dispatch(type: string) {
    for (const listener of [...(this.listeners[type] ?? [])]) {
      listener({ type })
    }
  }
}

async function resolveHeaders(rawHeaders: string) {
  FakeXMLHttpRequest.rawHeaders = rawHeaders
  let receivedHeaders: Record<string, string> | undefined
  const { lyla } = createLyla({ createContext: () => undefined })
  const response = await lyla.get('/', {
    hooks: {
      onHeadersReceived: [
        ({ headers }) => {
          receivedHeaders = headers
        }
      ]
    }
  })
  expect(receivedHeaders).toEqual(response.headers)
  return response.headers
}

describe('web adapter response headers', () => {
  beforeEach(() => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps header values containing colons', async () => {
    const headers = await resolveHeaders(
      [
        'date: Fri, 16 Oct 2026 04:30:00 GMT',
        'location: https://example.com/login?next=/home',
        'x-time: 12:34:56'
      ].join('\r\n')
    )
    expect(headers).toEqual({
      date: 'Fri, 16 Oct 2026 04:30:00 GMT',
      location: 'https://example.com/login?next=/home',
      'x-time': '12:34:56'
    })
  })

  it('lower cases names and trims names and values', async () => {
    const headers = await resolveHeaders(
      'Content-Type :  application/json \r\nX-Empty:\r\n'
    )
    expect(headers).toEqual({
      'content-type': 'application/json',
      'x-empty': ''
    })
  })

  it('ignores lines without colon or with empty name', async () => {
    const headers = await resolveHeaders(
      ['x-valid: value', 'malformed', ': no name', '  : blank name'].join(
        '\r\n'
      )
    )
    expect(headers).toEqual({ 'x-valid': 'value' })
  })

  it('resolves empty headers', async () => {
    expect(await resolveHeaders('')).toEqual({})
  })
})
