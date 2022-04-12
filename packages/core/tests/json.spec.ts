import test, { expect } from '@playwright/test'
import { LYLA_ERROR } from '../src/error'
import { beforeEach } from './utils'
import './types'

beforeEach(test)

test('throws error if response is not json serializable', async ({ page }) => {
  const [throws, body, lylaErrorType] = await page.evaluate(async () => {
    let catched = false
    let body: any
    let lylaErrorType: LYLA_ERROR | undefined
    try {
      const resp = await window.lyla.get('/api/get-text')
      body = resp.body
      console.log(resp.json)
      return [false, '']
    } catch (e) {
      catched = true
      window.catchError(({ lylaError }) => {
        lylaErrorType = lylaError?.type
      })(e)
    }
    return [catched, body, lylaErrorType]
  })
  expect(throws).toEqual(true)
  expect(body).toEqual('hello world')
  expect(lylaErrorType).toEqual(LYLA_ERROR.INVALID_JSON)
})

test('json', async ({ page }) => {
  const json = await page.evaluate(async () => {
    return (await window.lyla.get('/api/get-json')).json
  })
  expect(json).toEqual({ key: 'value' })
})

test('throws error if try getting json when `responseType` is not `text`', async ({
  page
}) => {
  const [throws0, bodyIsBlob, lylaErrorType0] = await page.evaluate(
    async () => {
      let catched = false
      let body: any
      let lylaErrorType: LYLA_ERROR | undefined
      try {
        const resp = await window.lyla.get('/api/get-text', {
          responseType: 'blob'
        })
        body = resp.body
        console.log(resp.json)
        return [false, body instanceof Blob, lylaErrorType]
      } catch (e) {
        catched = true
        window.catchError(({ lylaError }) => {
          lylaErrorType = lylaError?.type
        })(e)
      }
      return [catched, body instanceof Blob, lylaErrorType]
    }
  )
  expect(throws0).toEqual(true)
  expect(bodyIsBlob).toEqual(true)
  expect(lylaErrorType0).toEqual(LYLA_ERROR.INVALID_CONVERSION)
  const [throws1, bodyIsArryBuffer, lylaErrorType1] = await page.evaluate(
    async () => {
      let catched = false
      let body: any
      let lylaErrorType: LYLA_ERROR | undefined
      try {
        const resp = await window.lyla.get('/api/get-text', {
          responseType: 'arraybuffer'
        })
        body = resp.body
        console.log(resp.json)
        return [false, body instanceof ArrayBuffer, lylaErrorType]
      } catch (e) {
        catched = true
        window.catchError(({ lylaError }) => {
          lylaErrorType = lylaError?.type
        })(e)
      }
      return [catched, body instanceof ArrayBuffer, lylaErrorType]
    }
  )
  expect(throws1).toEqual(true)
  expect(bodyIsArryBuffer).toEqual(true)
  expect(lylaErrorType1).toEqual(LYLA_ERROR.INVALID_CONVERSION)
})

test('json can be set', async ({ page }) => {
  expect(
    await page.evaluate(async () => {
      const resp = await window.lyla.get('/api/get-text', {
        responseType: 'arraybuffer'
      })
      resp.json = 'resp json'
      return resp.json
    })
  ).toEqual('resp json')
})
