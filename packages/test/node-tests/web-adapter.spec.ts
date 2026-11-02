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
  protected dispatch(type: string, event: unknown = { type }) {
    for (const listener of [...(this.listeners[type] ?? [])]) {
      listener(event)
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

  it('lower cases names and keeps browser-normalized values', async () => {
    const headers = await resolveHeaders(
      'Content-Type: application/json\r\nX-Empty: \r\n'
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

describe('web xhr routing', () => {
  beforeEach(() => {
    vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest)
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it.each([
    undefined,
    {},
    { api: 'xhr' as const },
    { api: 'auto' as const },
    { fetchOptions: undefined },
    { api: 'auto' as const, fetchOptions: undefined }
  ])(
    'uses xhr for %j', async (extraOptions) => {
      const { lyla } = createLyla({ createContext: () => undefined })
      const onHeadersReceived = vi.fn()
      const response = await lyla.get('/', {
        extraOptions,
        hooks: { onHeadersReceived: [onHeadersReceived] }
      })
      expect(response.detail).toEqual({ adapter: 'xhr', value: { type: 'loadend' } })
      expect(onHeadersReceived.mock.calls[0][0].originalRequest.value).toBeInstanceOf(FakeXMLHttpRequest)
      expect(onHeadersReceived.mock.calls[0][0].originalRequest.adapter).toBe('xhr')
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  const sharedBodies: Array<[string, () => XMLHttpRequestBodyInit]> = [
    ['string', () => 'body'],
    ['ArrayBuffer', () => new ArrayBuffer(4)],
    ['Uint8Array', () => new Uint8Array([1, 2, 3])],
    ['DataView', () => new DataView(new ArrayBuffer(4))],
    ['Blob', () => new Blob(['body'])],
    ['URLSearchParams', () => new URLSearchParams({ key: 'value' })],
    ['FormData', () => new FormData()]
  ]

  describe.each([undefined, 'auto'] as const)(
    'automatic selection with api %s',
    (api) => {
      it.each(sharedBodies)(
        'uses xhr for a shared %s body',
        async (_, createBody) => {
          const { lyla } = createLyla({ createContext: () => undefined })
          const response = await lyla.post('/', {
            body: createBody(),
            extraOptions: { api }
          })
          expect(response.detail).toEqual({ adapter: 'xhr', value: { type: 'loadend' } })
          expect(fetch).not.toHaveBeenCalled()
        }
      )

      it.each(['text', 'arraybuffer', 'blob'] as const)(
        'uses xhr for the shared %s response type',
        async (responseType) => {
          const { lyla } = createLyla({ createContext: () => undefined })
          const response = await lyla.get('/', {
            responseType,
            extraOptions: { api }
          })
          expect(response.detail).toEqual({ adapter: 'xhr', value: { type: 'loadend' } })
          expect(fetch).not.toHaveBeenCalled()
        }
      )

      it('uses xhr for JSON, credentials, headers and download progress', async () => {
        const { lyla } = createLyla({ createContext: () => undefined })
        const response = await lyla.post('/', {
          json: { key: 'value' },
          headers: { 'X-Custom': 'value' },
          withCredentials: true,
          onDownloadProgress() {},
          extraOptions: { api }
        })
        expect(response.detail).toEqual({ adapter: 'xhr', value: { type: 'loadend' } })
        expect(fetch).not.toHaveBeenCalled()
      })
    }
  )

  it.each([{}, { cache: 'no-store' as const }])(
    'rejects explicit xhr with fetchOptions %j before sending', async (fetchOptions) => {
      const open = vi.spyOn(FakeXMLHttpRequest.prototype, 'open')
      const { lyla } = createLyla({ createContext: () => undefined })
      await expect(lyla.get('/', {
        extraOptions: { api: 'xhr', fetchOptions }
      })).rejects.toMatchObject({
        type: 'BAD_REQUEST',
        error: new Error('`fetchOptions` cannot be used with `api: "xhr"`')
      })
      expect(open).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  it('rejects xhr when instance defaults provide fetchOptions', async () => {
    const open = vi.spyOn(FakeXMLHttpRequest.prototype, 'open')
    const { lyla } = createLyla({
      createContext: () => undefined,
      extraOptions: { fetchOptions: { cache: 'no-store' } }
    })
    await expect(lyla.get('/', {
      extraOptions: { api: 'xhr' }
    })).rejects.toMatchObject({ type: 'BAD_REQUEST' })
    expect(open).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects a stream body with explicit xhr before sending', async () => {
    const open = vi.spyOn(FakeXMLHttpRequest.prototype, 'open')
    const { lyla } = createLyla({ createContext: () => undefined })
    await expect(lyla.post('/', {
      body: new ReadableStream({ start(controller) { controller.close() } }),
      extraOptions: { api: 'xhr' }
    })).rejects.toMatchObject({
      type: 'BAD_REQUEST',
      error: new Error('ReadableStream bodies cannot be used with `api: "xhr"`')
    })
    expect(open).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('uses xhr for auto with an ordinary body and upload progress', async () => {
    const open = vi.spyOn(FakeXMLHttpRequest.prototype, 'open')
    const { lyla } = createLyla({ createContext: () => undefined })
    await lyla.post('/', {
      body: 'body',
      extraOptions: { api: 'auto' },
      onUploadProgress() {}
    })
    expect(open).toHaveBeenCalledOnce()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps native xhr details in the standalone xhr package', async () => {
    const { lyla } = await import('@lylajs/web-xhr')
    const response = await lyla.get('/')
    expect(response.detail).toEqual({ type: 'loadend' })
  })

  it('keeps xhr network events as detail without fabricating an Error', async () => {
    const detail = { type: 'error' }
    class FailingXMLHttpRequest extends FakeXMLHttpRequest {
      send() { setTimeout(() => this.dispatch('error', detail)) }
    }
    vi.stubGlobal('XMLHttpRequest', FailingXMLHttpRequest)
    const { lyla } = createLyla({ createContext: () => undefined })
    await expect(lyla.get('/')).rejects.toMatchObject({
      type: 'NETWORK', error: undefined, detail: { adapter: 'xhr', value: detail }
    })
  })
})
