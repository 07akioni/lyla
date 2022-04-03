import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'
import './types'

beforeEach(test)

test('`extend` should work', async ({ page }) => {
  let text = await page.evaluate(async () => {
    const extended = window.lyla.extend({ baseUrl: 'http://localhost:7070' })
    await extended.get('api/get-set-cookie')
    await extended.get('/api/get-set-cookie')
    return (await extended.get('http://localhost:8080/api/get-text')).body
  })
  expect(text).toEqual('hello world')
  text = await page.evaluate(async () => {
    const extended = window.lyla.extend({ baseUrl: 'http://localhost:7070/' })
    await extended.get('api/get-set-cookie')
    await extended.get('/api/get-set-cookie')
    return (await extended.get('http://localhost:8080/api/get-text')).body
  })
  expect(text).toEqual('hello world')
})
