import test, { expect } from '@playwright/test'
import { CEEK_ERROR } from '../src/error'
import { beforeEach } from './utils'

beforeEach(test)

test('throws error if response is not json serializable', async ({ page }) => {
  const [throws, body, ceekErrorType] = await page.evaluate(async () => {
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
  })
  expect(throws).toEqual(true)
  expect(body).toEqual('hello world')
  expect(ceekErrorType).toEqual(CEEK_ERROR.INVALID_JSON)
})

test('json', async ({ page }) => {
  const json = await page.evaluate(async () => {
    return (await window.ceek.get('/api/get-json')).json
  })
  expect(json).toEqual({ key: 'value' })
})

test('throws error if try getting json when `responseType` is not `text`', async ({
  page
}) => {
  const [throws0, bodyIsBlob, ceekErrorType0] = await page.evaluate(
    async () => {
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
    }
  )
  expect(throws0).toEqual(true)
  expect(bodyIsBlob).toEqual(true)
  expect(ceekErrorType0).toEqual(CEEK_ERROR.INVALID_TRANSFORMATION)
  const [throws1, bodyIsArryBuffer, ceekErrorType1] = await page.evaluate(
    async () => {
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
    }
  )
  expect(throws1).toEqual(true)
  expect(bodyIsArryBuffer).toEqual(true)
  expect(ceekErrorType1).toEqual(CEEK_ERROR.INVALID_TRANSFORMATION)
})

test('json can be set', async ({ page }) => {
  expect(
    await page.evaluate(async () => {
      const resp = await window.ceek.get('/api/get-text', {
        responseType: 'arraybuffer'
      })
      resp.json = 'resp json'
      return resp.json
    })
  ).toEqual('resp json')
})
