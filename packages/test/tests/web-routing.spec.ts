import { expect, test } from '@playwright/test'
import { beforeEach, trackRequests, uniqueId } from './utils'
import './types'

beforeEach(test)

for (const responseType of ['text', 'arraybuffer', 'blob'] as const) {
  test(`fetch reads ${responseType} with native details and download progress`, async ({ page }) => {
    const result = await page.evaluate(async (responseType) => {
      let requestIsNative = false
      const loaded: number[] = []
      let progressIsNative = false
      const response = await window.lyla.get('/api/get-text', {
        extraOptions: { api: 'fetch' },
        responseType,
        onDownloadProgress(progress) {
          loaded.push(progress.loaded)
          const detail = window.nativeDetail(progress.detail)
          progressIsNative = !!detail && typeof detail === 'object' &&
            'value' in detail && detail.value instanceof Uint8Array &&
            window.nativeDetail(progress.originalRequest) instanceof Request
        },
        hooks: { onHeadersReceived: [({ originalRequest }) => {
          requestIsNative = window.nativeDetail(originalRequest) instanceof Request
        }] }
      })
      const text = typeof response.body === 'string'
        ? response.body
        : response.body instanceof Blob
          ? await response.body.text()
          : new TextDecoder().decode(response.body)
      return {
        text, requestIsNative, progressIsNative, loaded,
        responseIsNative: 'adapter' in response.detail && response.detail.adapter === 'fetch' && response.detail.value instanceof Response
      }
    }, responseType)
    expect(result.text).toBe('hello world')
    expect(result.requestIsNative).toBe(true)
    expect(result.responseIsNative).toBe(true)
    expect(result.progressIsNative).toBe(true)
    expect(result.loaded.at(-1)).toBe(11)
  })
}

test('fetchOptions select fetch and preserve JSON and custom headers', async ({ page }) => {
  const response = await page.evaluate(async () => {
    const response = await window.lyla.post('/api/echo', {
      json: { hello: 'world' },
      headers: { 'X-Custom': 'value' },
      extraOptions: { fetchOptions: { cache: 'no-store' } }
    })
    return { json: response.json, isFetch: 'adapter' in response.detail && response.detail.adapter === 'fetch' && response.detail.value instanceof Response }
  })
  expect(response.isFetch).toBe(true)
  expect(response.json).toMatchObject({
    method: 'POST', body: '{"hello":"world"}',
    headers: { 'x-custom': 'value', 'content-type': 'application/json' }
  })
})

test('explicit xhr rejects fetchOptions before sending', async ({ page }) => {
  const id = uniqueId()
  const { sent } = trackRequests(page, id)
  const result = await page.evaluate(async (id) => {
    try {
      await window.lyla.get(`/api/echo?id=${id}`, {
        extraOptions: { api: 'xhr', fetchOptions: {} }
      })
    } catch (error) {
      if (window.isLylaError(error)) return error.type
    }
  }, id)
  expect(result).toBe('BAD_REQUEST')
  expect(sent).toEqual([])
})

test('auto selects fetch for a stream body and supplies a valid native Request', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const originalFetch = window.fetch
    let requestBody: string | undefined
    let isRequest = false
    window.fetch = async (input) => {
      isRequest = input instanceof Request
      requestBody = await (input as Request).text()
      return new Response('response')
    }
    try {
      const response = await window.lyla.post('/api/echo', {
        extraOptions: { api: 'auto' },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('stream body'))
            controller.close()
          }
        })
      })
      return { isRequest, requestBody, body: response.body, isFetch: 'adapter' in response.detail && response.detail.adapter === 'fetch' && response.detail.value instanceof Response }
    } finally {
      window.fetch = originalFetch
    }
  })
  expect(result).toEqual({ isRequest: true, requestBody: 'stream body', body: 'response', isFetch: true })
})

test('explicit fetch lets the native API reject a GET body', async ({ page }) => {
  const id = uniqueId()
  const { sent } = trackRequests(page, id)
  const result = await page.evaluate(async (id) => {
    try {
      await window.lyla.get(`/api/echo?id=${id}`, {
        extraOptions: { api: 'fetch' },
        allowGetBody: true,
        body: 'body'
      })
    } catch (error) {
      if (window.isLylaError(error)) {
        return { type: error.type, isNative: error.error instanceof TypeError }
      }
    }
  }, id)
  expect(result).toEqual({ type: 'BAD_REQUEST', isNative: true })
  expect(sent).toEqual([])
})

test('fetch upload progress fails before any request is sent', async ({ page }) => {
  const id = uniqueId()
  const { sent } = trackRequests(page, id)
  const type = await page.evaluate(async (id) => {
    try {
      await window.lyla.post(`/api/echo?id=${id}`, {
        extraOptions: { api: 'fetch' }, onUploadProgress() {}
      })
    } catch (error) {
      if (window.isLylaError(error)) return error.type
    }
  }, id)
  expect(type).toBe('BAD_REQUEST')
  expect(sent).toEqual([])
})

test('fetch keeps the native Error for network failures', async ({ page }) => {
  const result = await page.evaluate(async () => {
    try {
      await window.lyla.get('http://localhost:8099/', { extraOptions: { api: 'fetch' } })
    } catch (error) {
      if (window.isLylaError(error) && error.type === window.LYLA_ERROR.NETWORK) {
        return {
          type: error.type,
          nativeError: error.error instanceof Error,
          sameError: !!error.detail && typeof error.detail === 'object' &&
            'adapter' in error.detail && error.detail.adapter === 'fetch' &&
            'value' in error.detail && error.error === error.detail.value,
          adapter: !!error.detail && typeof error.detail === 'object' &&
            'adapter' in error.detail ? error.detail.adapter : undefined
        }
      }
    }
  })
  expect(result).toEqual({ type: 'NETWORK', nativeError: true, sameError: true, adapter: 'fetch' })
})

test('fetch abort and timeout retain their error types', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const getType = (error: unknown) => window.isLylaError(error) ? error.type : 'unexpected'
    const controller = new window.LylaAbortController()
    const aborted = window.lyla.get('/api/delay?ms=1000', {
      extraOptions: { api: 'fetch' }, signal: controller.signal
    }).catch(getType)
    controller.abort()
    const timeout = window.lyla.get('/api/delay?ms=1000', {
      extraOptions: { api: 'fetch' }, timeout: 5
    }).catch(getType)
    return Promise.all([aborted, timeout])
  })
  expect(result).toEqual(['ABORTED', 'TIMEOUT'])
})
