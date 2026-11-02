import { expect, test } from '@playwright/test'
import { beforeEach, trackRequests } from './utils'
import './types'

beforeEach(test)

for (const native of [true, false]) {
  test(`cancels an active download with ${native ? 'AbortController' : 'LylaAbortController'}`, async ({ page }) => {
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      uploadThroughput: -1,
      downloadThroughput: 100000,
      latency: 0
    })
    const { failed } = trackRequests(page, '/api/post-return-body')
    const result = await page.evaluate(async (native) => {
      const controller = native ? new AbortController() : new window.LylaAbortController()
      const loaded: number[] = []
      try {
        await window.lyla.post('/api/post-return-body', {
          body: 'x'.repeat(800000),
          signal: controller.signal,
          onDownloadProgress(progress) {
            loaded.push(progress.loaded)
            controller.abort()
          }
        })
      } catch (error) {
        const count = loaded.length
        await new Promise((resolve) => setTimeout(resolve, 100))
        return {
          type: window.isLylaError(error) ? error.type : undefined,
          loaded,
          noLaterProgress: loaded.length === count
        }
      }
    }, native)
    expect(result?.type).toBe('ABORTED')
    expect(result?.loaded.length).toBeGreaterThan(0)
    expect(result?.loaded.at(-1)).toBeLessThan(800000)
    expect(result?.noLaterProgress).toBe(true)
    await expect.poll(() => failed).toEqual(['net::ERR_ABORTED'])
  })
}
