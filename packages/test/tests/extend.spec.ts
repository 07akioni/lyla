import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'
import './types'

beforeEach(test)

test('`extend` should work', async ({ page }) => {
  let text = await page.evaluate(async () => {
    const { lyla: extended } = window.createLyla({
      baseUrl: 'http://localhost:7070',
      context: null
    })
    await extended.get('api/get-set-cookie')
    await extended.get('/api/get-set-cookie')
    return (await extended.get('http://localhost:8080/api/get-text')).body
  })
  expect(text).toEqual('hello world')
  text = await page.evaluate(async () => {
    const { lyla: extended } = window.createLyla({
      baseUrl: 'http://localhost:7070/',
      context: null
    })
    await extended.get('api/get-set-cookie')
    await extended.get('/api/get-set-cookie')
    return (await extended.get('http://localhost:8080/api/get-text')).body
  })
  expect(text).toEqual('hello world')
})

test('`headers` extended', async ({ page }) => {
  const headers = await page.evaluate(async () => {
    const { lyla: extended } = window.createLyla({
      baseUrl: '/api',
      headers: {
        str: 'str',
        num: 123
      },
      context: null
    })
    const { headers } = await extended.post('/post-return-headers')
    return headers
  })
  expect(headers.str).toEqual('str')
  expect(headers.num).toEqual('123')
})

test('`headers` extended can be overrided', async ({ page }) => {
  const headers = await page.evaluate(async () => {
    const { lyla: extended } = window.createLyla({
      baseUrl: '/api',
      headers: {
        str: 'str',
        num: 123
      },
      context: null
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
    const { lyla: extended } = window.createLyla({
      baseUrl: 'http://localhost:8080',
      context: null
    })
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

test('`extend` multiple times', async ({ page }) => {
  const headers = await page.evaluate(async () => {
    const { lyla: extended1 } = window.createLyla({
      baseUrl: '/x',
      headers: {
        str: 'str',
        num: 123,
        wow: 'wow',
        gigi: ''
      },
      context: null
    })
    const { lyla: extended2 } = window.createLyla({
      baseUrl: '/api',
      headers: {
        num: 22,
        wow: 'wow',
        gigi: ''
      },
      context: null
    })
    const { headers } = await extended2.post('/post-return-headers', {
      headers: {
        gigi: 'gigi'
      }
    })
    return headers
  })
  expect(headers.str).toEqual(undefined)
  expect(headers.num).toEqual('22')
  expect(headers.wow).toEqual('wow')
  expect(headers.gigi).toEqual('gigi')
})
