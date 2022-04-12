import { expect, test } from '@playwright/test'
import { LYLA_ERROR } from '../src/error'
import { beforeEach } from './utils'
import './types'

beforeEach(test)

test('`onResponseError` hook 1', async ({ page }) => {
  const client = await page.context().newCDPSession(page)
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    uploadThroughput: 2000000,
    downloadThroughput: 4000000,
    connectionType: 'wifi',
    latency: 0
  })
  const errorType = await page.evaluate(async () => {
    const controller = new AbortController()
    let errorType: LYLA_ERROR | undefined = undefined
    setTimeout(() => {
      controller.abort()
    }, 300)
    const lyla = window.lyla.extend({
      hooks: {
        onResponseError: [
          (error) => {
            errorType = error.type
          }
        ]
      }
    })
    try {
      await lyla.post('/api/post-return-body', {
        responseType: 'text',
        body: Array(200000).fill('xxxx').join(''),
        signal: controller.signal
      })
    } catch (e) {}
    return errorType
  })
  await page.waitForTimeout(2000)
  expect(errorType).toEqual(LYLA_ERROR.ABORTED)
})

test('`onResponseError` hook', async ({ page }) => {
  const client = await page.context().newCDPSession(page)
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    uploadThroughput: 2000000,
    downloadThroughput: 4000000,
    connectionType: 'wifi',
    latency: 0
  })
  const errorType = await page.evaluate(async () => {
    const controller = new AbortController()
    let errorType: LYLA_ERROR | undefined = undefined
    setTimeout(() => {
      controller.abort()
    }, 300)
    try {
      await window.lyla.post('/api/post-return-body', {
        responseType: 'text',
        body: Array(200000).fill('xxxx').join(''),
        signal: controller.signal,
        hooks: {
          onResponseError: [
            (error) => {
              errorType = error.type
            }
          ]
        }
      })
    } catch (e) {}
    return errorType
  })
  await page.waitForTimeout(2000)
  expect(errorType).toEqual(LYLA_ERROR.ABORTED)
})
