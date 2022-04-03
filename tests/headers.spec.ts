import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'
import './types'

beforeEach(test)

test('`headers` can be merged with different case', async ({ page }) => {
  const headers = await page.evaluate(async () => {
    const lyla = window.lyla.extend({
      headers: {
        Key: 'Key'
      }
    })
    const { headers } = await lyla.post('/api/post-return-headers', {
      headers: {
        key: 'key'
      }
    })
    return headers
  })
  expect(headers.key).toEqual('key')
})

// It's hard to simulat duplicate headers using gin
// Although it's legal response

// test('response `headers` case', async ({ page }) => {
//   const headers = await page.evaluate(async () => {
//     const { headers } = await window.lyla.get('/api/get-headers')
//     return headers
//   })
//   console.log(headers)
// })