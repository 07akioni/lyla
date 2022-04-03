import { expect, test } from '@playwright/test'
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
  const [up, dp] = await page.evaluate(async () => {
    const up: number[] = []
    const dp: number[] = []
    await window.lyla.post('/api/post-return-body', {
      responseType: 'text',
      body: Array(200000).fill('xxxx').join(''),
      onUploadProgress(e) {
        up.push(e.percent)
      },
      onDownloadProgress(e) {
        dp.push(e.percent)
      }
    })
    return [up, dp]
  })
  expect(up.length > 1).toBe(true)
  expect(dp.length > 1).toBe(true)
})
