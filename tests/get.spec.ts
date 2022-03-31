import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'

beforeEach(test)

test('get, `responseType` is not set', async ({ page }) => {
  const body = await page.evaluate(async () => {
    const { body } = await window.ceek.get('/api/get-text')
    return body
  })
  expect(body).toEqual('hello world')
})

test('get, `responseType` is set to `text`', async ({ page }) => {
  const body = await page.evaluate(async () => {
    const { body } = await window.ceek.get('/api/get-text')
    return body
  })
  expect(body).toEqual('hello world')
})

test('get, `responseType` is set to `arraybuffer`', async ({ page }) => {
  const isArrayBuffer = await page.evaluate(async () => {
    const { body } = await window.ceek.get('/api/get-text', {
      responseType: 'arraybuffer'
    })
    return body instanceof ArrayBuffer
  })
  expect(isArrayBuffer).toEqual(true)
})

test('get, `responseType` is set to `blob`', async ({ page }) => {
  const isArrayBuffer = await page.evaluate(async () => {
    const { body } = await window.ceek.get('/api/get-text', {
      responseType: 'blob'
    })
    return body instanceof Blob
  })
  expect(isArrayBuffer).toEqual(true)
})
