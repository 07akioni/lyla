import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'
import './types'

beforeEach(test)

test('`headers` can be merged with different case', async ({ page }) => {
  const headers = await page.evaluate(async () => {
    const { lyla } = window.createLyla({
      headers: {
        Key: 'Key'
      },
      context: null
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
