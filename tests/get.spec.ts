import { expect, test } from '@playwright/test'
import { CEEK_ERROR } from '../src/error'

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
  const [throws, body, ceekErrorType] = await page.evaluate(
    async () => {
      let catched = false
      let body: any
      let ceekErrorType: CEEK_ERROR
      try {
        const resp = await window.ceek.get('/api/get-text')
        body = resp.body
        console.log(resp.json)
        return [false, '']
      } catch (e) {
        catched = true
        window.onError(({ ceekError }) => {
          ceekErrorType = ceekError.type
        })(e)
      }
      return [catched, body, ceekErrorType]
    }
  )
  expect(throws).toEqual(true)
  expect(body).toEqual('hello world')
  expect(ceekErrorType).toEqual(CEEK_ERROR.INVALID_JSON)
})

test('get, json', async ({ page }) => {
  const json = await page.evaluate(async () => {
    return (await window.ceek.get('/api/get-json')).json
  })
  expect(json).toEqual({ key: 'value' })
})

test('get, throws error if try getting json when `responseType` is not `text`', async ({
  page
}) => {
  const [throws0, bodyIsBlob, ceekErrorType0] = await page.evaluate(async () => {
    let catched = false
    let body: any
    let ceekErrorType: CEEK_ERROR
    try {
      const resp = await window.ceek.get('/api/get-text', {
        responseType: 'blob'
      })
      body = resp.body
      console.log(resp.json)
      return [false, body instanceof Blob, ceekErrorType]
    } catch (e) {
      catched = true
      window.onError(({ ceekError }) => {
        ceekErrorType = ceekError.type
      })(e)
    }
    return [catched, body instanceof Blob, ceekErrorType]
  })
  expect(throws0).toEqual(true)
  expect(bodyIsBlob).toEqual(true)
  expect(ceekErrorType0).toEqual(CEEK_ERROR.INVALID_TRANSFORMATION)
  const [throws1, bodyIsArryBuffer, ceekErrorType1] = await page.evaluate(async () => {
    let catched = false
    let body: any
    let ceekErrorType: CEEK_ERROR
    try {
      const resp = await window.ceek.get('/api/get-text', {
        responseType: 'arraybuffer'
      })
      body = resp.body
      console.log(resp.json)
      return [false, body instanceof ArrayBuffer, ceekErrorType]
    } catch (e) {
      catched = true
      window.onError(({ ceekError }) => {
        ceekErrorType = ceekError.type
      })(e)
    }
    return [catched, body instanceof ArrayBuffer, ceekErrorType]
  })
  expect(throws1).toEqual(true)
  expect(bodyIsArryBuffer).toEqual(true)
  expect(ceekErrorType1).toEqual(CEEK_ERROR.INVALID_TRANSFORMATION)
})
