import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'

beforeEach(test)
;(['get', 'post', 'delete', 'put', 'patch'] as const).forEach((method) => {
  test(`${method}, \`responseType\` is not set`, async ({ page }) => {
    const body = await page.evaluate(async (method) => {
      const { body } = await window.ceek[method](`/api/${method}-text`)
      return body
    }, method)
    expect(body).toEqual('hello world')
  })

  test(`${method}, \`responseType\` is set to \`text\``, async ({ page }) => {
    const body = await page.evaluate(async (method) => {
      const { body } = await window.ceek[method](`/api/${method}-text`)
      return body
    }, method)
    expect(body).toEqual('hello world')
  })

  test(`${method}, \`responseType\` is set to \`arraybuffer\``, async ({
    page
  }) => {
    const isArrayBuffer = await page.evaluate(async (method) => {
      const { body } = await window.ceek[method](`/api/${method}-text`, {
        responseType: 'arraybuffer'
      })
      return body instanceof ArrayBuffer
    }, method)
    expect(isArrayBuffer).toEqual(true)
  })

  test(`${method}, \`responseType\` is set to \`blob\``, async ({ page }) => {
    const isArrayBuffer = await page.evaluate(async (method) => {
      const { body } = await window.ceek[method](`/api/${method}-text`, {
        responseType: 'blob'
      })
      return body instanceof Blob
    }, method)
    expect(isArrayBuffer).toEqual(true)
  })
})
