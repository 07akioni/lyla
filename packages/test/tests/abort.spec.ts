import { expect, test } from '@playwright/test'
import { LYLA_ERROR } from '@lylajs/web/src'
import { beforeEach } from './utils'
import './types'

beforeEach(test)
;['native abort', 'lyla abort'].forEach((type, index) => {
  test('`uploadProgress` & `downloadProgress` ' + type, async ({ page }) => {
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      uploadThroughput: 2000000,
      downloadThroughput: 4000000,
      connectionType: 'wifi',
      latency: 0
    })
    const [errorType, up, dp] = await page.evaluate(async (index) => {
      const controller = new (
        index === 0 ? AbortController : window.LylaAbortController
      )()
      const up: number[] = []
      const dp: number[] = []
      setTimeout(() => {
        controller.abort()
      }, 300)
      try {
        await window.lyla.post('/api/post-return-body', {
          responseType: 'text',
          body: Array(200000).fill('xxxx').join(''),
          signal: controller.signal,
          onUploadProgress(e) {
            up.push(e.percent)
          },
          onDownloadProgress(e) {
            dp.push(e.percent)
          }
        })
      } catch (e) {
        if (window.isLylaError(e)) {
          return [e.type, up, dp]
        }
        return [undefined, [] as number[], [] as number[]]
      }
      return [undefined, [], []]
    }, index)
    await page.waitForTimeout(2000)
    expect(errorType).toEqual(LYLA_ERROR.ABORTED)
    expect(up.includes(100)).toEqual(false)
    expect(dp.includes(100)).toEqual(false)
  })
})
