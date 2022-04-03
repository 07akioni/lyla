import { expect, test } from '@playwright/test'
import { LYLA_ERROR } from '../src/error'
import { beforeEach } from './utils'
import './types'

beforeEach(test)

test('`uploadProgress` & `downloadProgress`', async ({ page }) => {
  const client = await page.context().newCDPSession(page)
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    uploadThroughput: 2000000,
    downloadThroughput: 4000000,
    connectionType: 'wifi',
    latency: 0
  })
  const [errorType, up, dp] = await page.evaluate(async () => {
    const controller = new AbortController()
    const up = []
    const dp = []
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
      return window.matchError(e, (e) => [e.lylaError.type, up, dp])
    }
    return undefined
  })
  await page.waitForTimeout(2000)
  expect(errorType).toEqual(LYLA_ERROR.ABORTED)
  expect(up.includes(100)).toEqual(false)
  expect(dp.includes(100)).toEqual(false)
})
