// @vitest-environment node
import { lyla, LylaAbortController, LYLA_ERROR } from '@lylajs/web-fetch'
import { createLyla as createWebLyla, lyla as webLyla } from '@lylajs/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const url = 'https://example.com/api'
const nativeFetch = globalThis.fetch
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => vi.unstubAllGlobals())

function streamedResponse(headers: Record<string, string> = {}) {
  const chunks = ['你', '好!'].map((value) => new TextEncoder().encode(value))
  return new Response(new ReadableStream({
    pull(controller) {
      const chunk = chunks.shift()
      if (chunk) controller.enqueue(chunk)
      else controller.close()
    }
  }), { headers })
}

function pendingFetch() {
  fetchMock.mockImplementation((input) => new Promise((_, reject) => {
    const request = input as Request
    request.signal.addEventListener('abort', () => reject(request.signal.reason))
  }))
}

describe('fetch adapter', () => {
  it('sends normalized options and exposes native request and response details', async () => {
    const nativeResponse = new Response('{"ok":true}', {
      headers: { 'Content-Type': 'application/json', 'X-Test': 'value' }
    })
    fetchMock.mockResolvedValue(nativeResponse)
    const onHeadersReceived = vi.fn()
    const response = await lyla.post(url, {
      json: { hello: 'world' },
      headers: { 'X-Request': 'value' },
      withCredentials: true,
      extraOptions: { fetchOptions: { cache: 'no-store', redirect: 'error' } },
      hooks: { onHeadersReceived: [onHeadersReceived] }
    })
    const request = fetchMock.mock.calls[0][0] as Request
    expect(request.url).toBe(url)
    expect(request.method).toBe('POST')
    expect(request.headers.get('x-request')).toBe('value')
    expect(request.headers.get('content-type')).toBe('application/json')
    expect(await request.text()).toBe('{"hello":"world"}')
    expect(request.credentials).toBe('include')
    expect(request.cache).toBe('no-store')
    expect(request.redirect).toBe('error')
    expect(onHeadersReceived).toHaveBeenCalledWith(expect.objectContaining({
      headers: { 'content-type': 'application/json', 'x-test': 'value' },
      originalRequest: request
    }), expect.any(Function))
    expect(response.detail).toBe(nativeResponse)
    expect(response.json).toEqual({ ok: true })
  })

  it.each([
    [undefined, false, 'same-origin'],
    [undefined, true, 'include'],
    ['omit', true, 'omit']
  ] as const)('uses credentials %s / %s -> %s', async (credentials, withCredentials, expected) => {
    fetchMock.mockResolvedValue(new Response('ok'))
    await lyla.get(url, { withCredentials, extraOptions: { fetchOptions: { credentials } } })
    expect((fetchMock.mock.calls[0][0] as Request).credentials).toBe(expected)
  })

  for (const responseType of ['text', 'arraybuffer', 'blob'] as const) {
    for (const progress of [false, true]) {
      it(`reads ${responseType} with download progress ${progress}`, async () => {
        const response = streamedResponse({ 'Content-Type': 'text/plain', 'Content-Length': '7' })
        fetchMock.mockResolvedValue(response)
        const onDownloadProgress = progress ? vi.fn() : undefined
        const result = await lyla.get(url, { responseType, onDownloadProgress })
        const text = typeof result.body === 'string'
          ? result.body
          : result.body instanceof Blob
            ? await result.body.text()
            : new TextDecoder().decode(result.body)
        expect(text).toBe('你好!')
        if (responseType === 'blob') expect((result.body as Blob).type).toBe('text/plain')
        if (onDownloadProgress) {
          expect(onDownloadProgress.mock.calls.map(([event]) => event.loaded)).toEqual([3, 7])
          const last = onDownloadProgress.mock.lastCall![0]
          expect(last).toMatchObject({ loaded: 7, total: 7, percent: 100, lengthComputable: true })
          expect(last.detail).toMatchObject({ done: false, value: expect.any(Uint8Array) })
          expect(last.originalRequest).toBe(fetchMock.mock.calls[0][0])
          expect(response.body!.locked).toBe(false)
        }
      })
    }
  }

  it.each<Record<string, string>>([
    {},
    { 'Content-Length': 'invalid' },
    { 'Content-Length': '0' },
    { 'Content-Length': '20', 'Content-Encoding': 'gzip' }
  ])('keeps progress finite for unknown, zero or encoded lengths: %j', async (headers) => {
    fetchMock.mockResolvedValue(streamedResponse(headers))
    const onDownloadProgress = vi.fn()
    await lyla.get(url, { onDownloadProgress })
    for (const [progress] of onDownloadProgress.mock.calls) {
      expect(progress.percent).toBe(0)
      expect(progress.total).toBe(0)
    }
  })

  it('handles responses without a body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    const onDownloadProgress = vi.fn()
    const response = await lyla.get(url, { onDownloadProgress })
    expect(response.status).toBe(204)
    expect(response.body).toBe('')
    expect(onDownloadProgress).not.toHaveBeenCalled()
  })

  it.each([new TypeError('Failed to fetch'), 'failure', { message: 'failure' }, undefined])(
    'preserves the rejection detail and only retains Error instances: %s', async (reason) => {
      fetchMock.mockRejectedValue(reason)
      await expect(lyla.get(url)).rejects.toMatchObject({
        type: LYLA_ERROR.NETWORK,
        error: reason instanceof Error ? reason : undefined,
        detail: reason
      })
    }
  )

  it('reports body stream failures as network errors', async () => {
    const error = new Error('stream disconnected')
    fetchMock.mockResolvedValue(new Response(new ReadableStream({
      start(controller) { controller.error(error) }
    })))
    await expect(lyla.get(url, { onDownloadProgress() {} })).rejects.toMatchObject({
      type: LYLA_ERROR.NETWORK, error, detail: error
    })
  })

  it('reports HTTP errors after reading the response', async () => {
    const response = new Response('not found', { status: 404 })
    fetchMock.mockResolvedValue(response)
    await expect(lyla.get(url)).rejects.toMatchObject({
      type: LYLA_ERROR.HTTP,
      response: { status: 404, body: 'not found', detail: response }
    })
  })

  it('rejects upload progress before sending', async () => {
    await expect(lyla.post(url, { onUploadProgress() {} })).rejects.toMatchObject({
      type: LYLA_ERROR.BAD_REQUEST,
      error: new Error('The fetch adapter does not support `onUploadProgress`')
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports invalid request setup as BAD_REQUEST', async () => {
    await expect(lyla.get('http://[')).rejects.toMatchObject({
      type: LYLA_ERROR.BAD_REQUEST,
      error: expect.any(TypeError)
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lets native Request reject a GET body before sending', async () => {
    await expect(lyla.get(url, {
      allowGetBody: true,
      body: 'body'
    })).rejects.toMatchObject({
      type: LYLA_ERROR.BAD_REQUEST,
      error: expect.any(TypeError)
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    { method: 'get', fetchOptions: { cache: 'only-if-cached', mode: 'cors' } },
    { method: 'put', fetchOptions: { mode: 'no-cors' } }
  ] as const)('rejects invalid fetch option combinations before sending: %j', async ({ method, fetchOptions }) => {
    await expect(lyla[method](url, { extraOptions: { fetchOptions } })).rejects.toMatchObject({
      type: LYLA_ERROR.BAD_REQUEST,
      error: expect.any(TypeError)
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('preserves asynchronous fetch policy failures as NETWORK errors', async () => {
    vi.stubGlobal('fetch', nativeFetch)
    await expect(lyla.get('data:text/plain,hello', {
      extraOptions: {
        fetchOptions: { integrity: 'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' }
      }
    })).rejects.toMatchObject({
      type: LYLA_ERROR.NETWORK,
      error: expect.any(TypeError)
    })
  })

  it('aborts the native request on user cancellation', async () => {
    pendingFetch()
    const controller = new LylaAbortController()
    const promise = lyla.get(url, { signal: controller.signal })
    controller.abort()
    await expect(promise).rejects.toMatchObject({ type: LYLA_ERROR.ABORTED })
    expect((fetchMock.mock.calls[0][0] as Request).signal.aborted).toBe(true)
  })

  it('aborts the native request on timeout', async () => {
    pendingFetch()
    await expect(lyla.get(url, { timeout: 5 })).rejects.toMatchObject({ type: LYLA_ERROR.TIMEOUT })
    expect((fetchMock.mock.calls[0][0] as Request).signal.aborted).toBe(true)
  })

  it('cancels before consuming the body when a header hook rejects', async () => {
    const response = streamedResponse()
    const cancel = vi.spyOn(response.body!, 'cancel')
    fetchMock.mockResolvedValue(response)
    const onDownloadProgress = vi.fn()
    await expect(lyla.get(url, {
      onDownloadProgress,
      hooks: { onHeadersReceived: [(_, reject) => reject('stopped')] }
    })).rejects.toBe('stopped')
    expect((fetchMock.mock.calls[0][0] as Request).signal.aborted).toBe(true)
    expect(cancel).toHaveBeenCalledOnce()
    expect(onDownloadProgress).not.toHaveBeenCalled()
  })

  it('keeps the timeout active while downloading the response body', async () => {
    fetchMock.mockResolvedValue(new Response(new ReadableStream({
      pull() { return new Promise(() => {}) }
    })))
    await expect(lyla.get(url, { timeout: 5 })).rejects.toMatchObject({ type: LYLA_ERROR.TIMEOUT })
    expect((fetchMock.mock.calls[0][0] as Request).signal.aborted).toBe(true)
  })
})

describe('web fetch routing', () => {
  it.each([
    { api: 'fetch' as const },
    { fetchOptions: {} },
    { fetchOptions: { keepalive: false } },
    { api: 'auto' as const, fetchOptions: {} },
    { api: 'auto' as const, fetchOptions: { keepalive: false } },
    { api: 'auto' as const, fetchOptions: { cache: 'no-store' as const } }
  ])('routes %j to fetch', async (extraOptions) => {
    const nativeResponse = streamedResponse({ 'Content-Length': '7' })
    fetchMock.mockResolvedValue(nativeResponse)
    const onHeadersReceived = vi.fn()
    const onDownloadProgress = vi.fn()
    const response = await webLyla.get(url, {
      extraOptions, onDownloadProgress,
      hooks: { onHeadersReceived: [onHeadersReceived] }
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(response.detail).toEqual({ adapter: 'fetch', value: nativeResponse })
    expect(response.detail.value).toBe(nativeResponse)
    expect(onHeadersReceived.mock.calls[0][0].originalRequest).toEqual({
      adapter: 'fetch', value: fetchMock.mock.calls[0][0]
    })
    const progress = onDownloadProgress.mock.lastCall![0]
    expect(progress.detail.adapter).toBe('fetch')
    expect(progress.detail.value.done).toBe(false)
    expect(progress.originalRequest).toEqual({ adapter: 'fetch', value: fetchMock.mock.calls[0][0] })
  })

  it('selects fetch from merged instance options', async () => {
    const { lyla } = createWebLyla({
      createContext: () => undefined,
      extraOptions: { fetchOptions: { cache: 'no-store' } }
    })
    fetchMock.mockResolvedValue(new Response('response'))
    const response = await lyla.get(url, { extraOptions: { api: 'auto' } })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect((fetchMock.mock.calls[0][0] as Request).cache).toBe('no-store')
    expect(response.detail.adapter).toBe('fetch')
    expect(response.detail.value).toBeInstanceOf(Response)
  })

  it.each([undefined, 'auto', 'fetch'] as const)(
    'routes a stream body to fetch with api %s and supplies duplex', async (api) => {
      const xhr = vi.fn()
      vi.stubGlobal('XMLHttpRequest', xhr)
      fetchMock.mockResolvedValue(new Response('response'))
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('stream body'))
          controller.close()
        }
      })
      const response = await webLyla.post(url, { body, extraOptions: { api } })
      const request = fetchMock.mock.calls[0][0] as Request & { duplex: string }
      expect(request.duplex).toBe('half')
      expect(await request.text()).toBe('stream body')
      expect(response.body).toBe('response')
      expect(xhr).not.toHaveBeenCalled()
    }
  )

  it('rejects conflicting stream bodies and upload progress in auto mode', async () => {
    await expect(webLyla.post(url, {
      extraOptions: { api: 'auto' },
      body: new ReadableStream({ start(controller) { controller.close() } }),
      onUploadProgress() {}
    })).rejects.toMatchObject({ type: LYLA_ERROR.BAD_REQUEST })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([undefined, null, 'failure', new TypeError('Failed to fetch')])(
    'preserves the adapter tag and rejection value: %s', async (reason) => {
      fetchMock.mockRejectedValue(reason)
      const error = await webLyla.get(url, {
        extraOptions: { api: 'fetch' }
      }).catch((error) => error)
      expect(error.type).toBe(LYLA_ERROR.NETWORK)
      expect(error.detail).toStrictEqual({ adapter: 'fetch', value: reason })
      expect(error.detail.value).toBe(reason)
      expect(error.error).toBe(reason instanceof Error ? reason : undefined)
    }
  )

  it('rejects upload progress on the routed fetch adapter', async () => {
    await expect(webLyla.post(url, {
      extraOptions: { fetchOptions: {} }, onUploadProgress() {}
    })).rejects.toMatchObject({ type: LYLA_ERROR.BAD_REQUEST })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
