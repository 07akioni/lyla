import { expect, test } from '@playwright/test'
import type { Ceek } from '../src'

declare global {
  interface Window {
    ceek: Ceek
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:8080')
})

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

test('get, throws error if response is not json serializable', async ({
  page
}) => {
  const throws = await page.evaluate(async () => {
    let catched = false
    let body: any
    try {
      const resp = await window.ceek.get('/api/get-text')
      body = resp.body
      console.log(resp.json)
      return [false, '']
    } catch (e) {
      catched = true
    }
    return [catched, body]
  })
  expect(throws[0]).toEqual(true)
  expect(throws[1]).toEqual('hello world')
})
