import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'
import "./types"

beforeEach(test)
;(['get', 'post', 'delete', 'put', 'patch'] as const).forEach((method) => {
  test(`${method}, \`responseType\` is not set`, async ({ page }) => {
    const body = await page.evaluate(async (method) => {
      const { body } = await window.lyla[method](`/api/${method}-text`)
      return body
    }, method)
    expect(body).toEqual('hello world')
  })

  test(`${method}, \`responseType\` is set to \`text\``, async ({ page }) => {
    const body = await page.evaluate(async (method) => {
      const { body } = await window.lyla[method](`/api/${method}-text`)
      return body
    }, method)
    expect(body).toEqual('hello world')
  })

  test(`${method}, \`responseType\` is set to \`arraybuffer\``, async ({
    page
  }) => {
    const isArrayBuffer = await page.evaluate(async (method) => {
      const { body } = await window.lyla[method](`/api/${method}-text`, {
        responseType: 'arraybuffer'
      })
      return body instanceof ArrayBuffer
    }, method)
    expect(isArrayBuffer).toEqual(true)
  })

  test(`${method}, \`responseType\` is set to \`blob\``, async ({ page }) => {
    const isArrayBuffer = await page.evaluate(async (method) => {
      const { body } = await window.lyla[method](`/api/${method}-text`, {
        responseType: 'blob'
      })
      return body instanceof Blob
    }, method)
    expect(isArrayBuffer).toEqual(true)
  })

  test(`${method}, request & response \`headers\` works`, async ({ page }) => {
    const respHeaders = await page.evaluate(async (method) => {
      const resp = await window.lyla[method](`/api/${method}-return-headers`, {
        headers: {
          headerKey: 'headerValue'
        }
      })
      return resp.headers
    }, method)
    expect(respHeaders.headerkey).toEqual('headerValue')
  })

  if (method !== 'get') {
    test(`${method}, \`request.json\` works`, async ({ page }) => {
      const [body, json] = await page.evaluate(async (method) => {
        const resp = await window.lyla[method](`/api/${method}-return-body`, {
          json: {
            jsonKey: 'jsonValue'
          }
        })
        return [resp.body, resp.json]
      }, method)
      expect((body as string).replace(/\s|\n/g, '')).toEqual(
        `{"jsonKey":"jsonValue"}`
      )
      expect(json).toEqual({ jsonKey: 'jsonValue' })
    })
  }
})
