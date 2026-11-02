import { expect, test } from '@playwright/test'
import { beforeEach, trackRequests, uniqueId } from './utils'
import './types'

beforeEach(test)

test('rejects upload progress before sending', async ({ page }) => {
  const id = uniqueId()
  const { sent } = trackRequests(page, id)
  const result = await page.evaluate(async (id) => {
    try {
      await window.lyla.post(`/api/echo?id=${id}`, { onUploadProgress() {} })
    } catch (error) {
      if (window.isLylaError(error)) {
        return { type: error.type, message: (error.error as Error).message }
      }
      throw error
    }
  }, id)
  expect(result).toEqual({
    type: 'BAD_REQUEST',
    message: 'The fetch adapter does not support `onUploadProgress`'
  })
  expect(sent).toEqual([])
})

test('lets the native API reject a GET body before sending', async ({ page }) => {
  const id = uniqueId()
  const { sent } = trackRequests(page, id)
  const result = await page.evaluate(async (id) => {
    try {
      await window.lyla.get(`/api/echo?id=${id}`, {
        allowGetBody: true,
        body: 'body'
      })
    } catch (error) {
      if (window.isLylaError(error)) {
        return { type: error.type, nativeError: error.error instanceof TypeError }
      }
      throw error
    }
  }, id)
  expect(result).toEqual({ type: 'BAD_REQUEST', nativeError: true })
  expect(sent).toEqual([])
})
