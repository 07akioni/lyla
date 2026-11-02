// @vitest-environment node
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

let universal: typeof import('lyla')
const fetchMock = vi.fn<typeof fetch>()

beforeAll(async () => {
  vi.stubGlobal('window', {})
  universal = await import('lyla')
})

beforeEach(() => {
  vi.stubGlobal('window', {})
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
})

afterEach(() => vi.unstubAllGlobals())

describe.each(['default', 'created'] as const)('universal browser %s instance', (kind) => {
  function client() {
    return kind === 'default'
      ? universal.lyla
      : universal.createLyla({ createContext: () => undefined }).lyla
  }

  it('exposes fetch tags and native values for responses, headers and progress', async () => {
    const nativeResponse = new Response('ok', { headers: { 'Content-Length': '2' } })
    fetchMock.mockResolvedValue(nativeResponse)
    const onHeadersReceived = vi.fn()
    const onDownloadProgress = vi.fn()
    const response = await client().get('https://example.com/', {
      extraOptions: { api: 'fetch' },
      hooks: { onHeadersReceived: [onHeadersReceived] },
      onDownloadProgress
    })
    const request = fetchMock.mock.calls[0][0]
    expect(response.detail).toEqual({ adapter: 'fetch', value: nativeResponse })
    expect(response.detail.value).toBe(nativeResponse)
    expect(onHeadersReceived.mock.calls[0][0].originalRequest).toEqual({
      adapter: 'fetch', value: request
    })
    expect(onDownloadProgress).toHaveBeenCalled()
    for (const [progress] of onDownloadProgress.mock.calls) {
      expect(progress.detail).toEqual({
        adapter: 'fetch', value: { done: false, value: expect.any(Uint8Array) }
      })
      expect(progress.originalRequest).toEqual({ adapter: 'fetch', value: request })
    }
  })

  it.each([undefined, null, 'failure', new TypeError('Failed to fetch')])(
    'retains fetch source and original rejection: %s', async (reason) => {
      fetchMock.mockRejectedValue(reason)
      const error = await client().get('https://example.com/', {
        extraOptions: { api: 'fetch' }
      }).catch((error) => error)
      expect(error.type).toBe('NETWORK')
      expect(error.detail).toStrictEqual({ adapter: 'fetch', value: reason })
      expect(error.detail.value).toBe(reason)
      expect(error.error).toBe(reason instanceof Error ? reason : undefined)
    }
  )
})
