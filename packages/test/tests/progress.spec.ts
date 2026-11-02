import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'
import './types'

beforeEach(test)

for (const responseType of ['text', 'arraybuffer', 'blob'] as const) {
  test(`reports download progress for ${responseType}`, async ({ page }) => {
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      uploadThroughput: -1,
      downloadThroughput: 1000000,
      latency: 0
    })
    const result = await page.evaluate(async (responseType) => {
      const events: Array<{ loaded: number; total: number; percent: number }> = []
      let nativeDetails = true
      const body = 'x'.repeat(800000)
      const response = await window.lyla.post('/api/post-return-body', {
        body,
        responseType,
        onDownloadProgress(progress) {
          events.push({ loaded: progress.loaded, total: progress.total, percent: progress.percent })
          const request = window.nativeDetail(progress.originalRequest)
          const detail = window.nativeDetail(progress.detail)
          nativeDetails &&= window.browserTarget.api === 'xhr'
            ? request instanceof XMLHttpRequest && detail instanceof ProgressEvent
            : request instanceof Request && !!detail && typeof detail === 'object' &&
              'value' in detail && detail.value instanceof Uint8Array
        }
      })
      const text = typeof response.body === 'string' ? response.body
        : response.body instanceof Blob ? await response.body.text()
        : new TextDecoder().decode(response.body)
      return { events, nativeDetails, matches: text === body }
    }, responseType)
    expect(result.matches).toBe(true)
    expect(result.nativeDetails).toBe(true)
    expect(result.events.length).toBeGreaterThan(1)
    expect(result.events.at(-1)).toEqual({ loaded: 800000, total: 800000, percent: 100 })
    expect(result.events.map((event) => event.loaded)).toEqual(
      result.events.map((event) => event.loaded).sort((a, b) => a - b)
    )
  })
}
