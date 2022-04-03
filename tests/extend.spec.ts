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

test('`headers` extended', async ({ page }) => {
  const headers = await page.evaluate(async () => {
    const extended = window.lyla.extend({
      baseUrl: '/api',
      headers: {
        str: 'str',
        num: 123
      }
    })
    const { headers } = await extended.post('/post-return-headers')
    return headers
  })
  expect(headers.str).toEqual('str')
  expect(headers.num).toEqual('123')
})

test('`headers` extended can be overrided', async ({ page }) => {
  const headers = await page.evaluate(async () => {
    const extended = window.lyla.extend({
      baseUrl: '/api',
      headers: {
        str: 'str',
        num: 123
      }
    })
    const { headers } = await extended.post('/post-return-headers', {
      headers: {
        str: 'strx',
        num: undefined
      }
    })
    return headers
  })
  expect(headers.str).toEqual('strx')
  expect(headers.num).toEqual(undefined)
})

test('`baseUrl` extended can be overrided', async ({ page }) => {
  await page.evaluate(async () => {
    const extended = window.lyla.extend({ baseUrl: 'http://localhost:8080' })
    await extended.get('api/get-set-cookie', {
      baseUrl: 'http://localhost:7070',
      withCredentials: true
    })
    await extended.get('api/get-check-cookie', {
      baseUrl: 'http://localhost:7070',
      withCredentials: true
    })
  })
})
