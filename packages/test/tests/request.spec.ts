import { expect, test } from '@playwright/test'
import { beforeEach } from './utils'
import type { Echo } from './utils'
import './types'

beforeEach(test)

test('method defaults to GET', async ({ page }) => {
  const echo = await page.evaluate(async () => {
    return (await window.lyla<Echo>({ url: '/api/echo' })).json
  })
  expect(echo.method).toBe('GET')
  expect(echo.body).toBe('')
})

for (const method of ['post', 'put', 'patch', 'delete'] as const) {
  test(`${method} sends json body`, async ({ page }) => {
    const echo = await page.evaluate(async (method) => {
      return (await window.lyla[method]<Echo>('/api/echo', { json: { a: 1 } }))
        .json
    }, method)
    expect(echo.method).toBe(method.toUpperCase())
    expect(echo.body).toBe('{"a":1}')
    expect(echo.headers['content-type']).toBe('application/json')
    expect(echo.headers['accept']).toBe('*/*')
  })
}

test('head request resolves with empty body', async ({ page }) => {
  const [status, body] = await page.evaluate(async () => {
    const response = await window.lyla.head('/api/echo')
    return [response.status, response.body]
  })
  expect(status).toBe(200)
  expect(body).toBe('')
})

test('sends raw body without changing content-type', async ({ page }) => {
  const echo = await page.evaluate(async () => {
    return (
      await window.lyla.post<Echo>('/api/echo', {
        body: 'a=1&b=2',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    ).json
  })
  expect(echo.body).toBe('a=1&b=2')
  expect(echo.headers['content-type']).toBe(
    'application/x-www-form-urlencoded'
  )
})

test('sends FormData body', async ({ page }) => {
  const echo = await page.evaluate(async () => {
    const formData = new FormData()
    formData.append('field', 'value')
    return (await window.lyla.post<Echo>('/api/echo', { body: formData })).json
  })
  expect(echo.headers['content-type']).toMatch(/^multipart\/form-data/)
  expect(echo.body).toContain('name="field"')
  expect(echo.body).toContain('value')
})

test('serializes query', async ({ page }) => {
  const echo = await page.evaluate(async () => {
    return (
      await window.lyla.get<Echo>('/api/echo', {
        query: {
          a: 1,
          b: ['x', 'y z'],
          c: null,
          d: undefined,
          e: true,
          f: '中文&='
        }
      })
    ).json
  })
  expect(echo.query).toEqual({
    a: ['1'],
    b: ['x', 'y z'],
    e: ['true'],
    f: ['中文&=']
  })
})

test('merges query of instance and request', async ({ page }) => {
  const echo = await page.evaluate(async () => {
    const { lyla } = window.createLyla({
      createContext: () => undefined,
      query: { instance: 'i', shared: 'instance' }
    })
    return (
      await lyla.get<Echo>('/api/echo', {
        query: { shared: 'request', request: 'r' }
      })
    ).json
  })
  expect(echo.query).toEqual({
    instance: ['i'],
    shared: ['request'],
    request: ['r']
  })
})

test('merges baseUrl', async ({ page }) => {
  const [relative, absolute] = await page.evaluate(async () => {
    const { lyla } = window.createLyla({
      createContext: () => undefined,
      baseUrl: '/api/'
    })
    const relative = (await lyla.get<Echo>('/echo', { query: { a: 1 } })).json
    const absolute = (
      await lyla.get<Echo>('http://localhost:8091/api/echo?b=2')
    ).json
    return [relative, absolute]
  })
  expect(relative.url).toBe('/api/echo?a=1')
  expect(absolute.url).toBe('/api/echo?b=2')
})

test('merges, lower cases and removes request headers', async ({ page }) => {
  const echo = await page.evaluate(async () => {
    const { lyla } = window.createLyla(
      {
        createContext: () => undefined,
        headers: { 'X-Instance': 'instance', 'X-Removed': 'removed' }
      },
      { headers: { 'X-Override': 1, 'X-Shared': 'override' } }
    )
    return (
      await lyla.get<Echo>('/api/echo', {
        headers: { 'x-removed': undefined, 'x-shared': 'request' }
      })
    ).json
  })
  expect(echo.headers['x-instance']).toBe('instance')
  expect(echo.headers['x-override']).toBe('1')
  expect(echo.headers['x-shared']).toBe('request')
  expect(echo.headers).not.toHaveProperty('x-removed')
})

test('keeps response header values containing colons', async ({ page }) => {
  const headers = await page.evaluate(async () => {
    return (
      await window.lyla.get('/api/get-return-headers', {
        headers: { 'X-Url': 'http://localhost:8091/a', 'X-Time': '12:34:56' }
      })
    ).headers
  })
  expect(headers['x-url']).toBe('http://localhost:8091/a')
  expect(headers['x-time']).toBe('12:34:56')
})

test('resolves arraybuffer and blob body', async ({ page }) => {
  const [arrayBufferText, blobText] = await page.evaluate(async () => {
    const arrayBuffer = (
      await window.lyla.get<unknown>('/api/get-text', {
        responseType: 'arraybuffer'
      })
    ).body as ArrayBuffer
    const blob = (
      await window.lyla.get<unknown>('/api/get-text', { responseType: 'blob' })
    ).body as Blob
    return [new TextDecoder().decode(arrayBuffer), await blob.text()]
  })
  expect(arrayBufferText).toBe('hello world')
  expect(blobText).toBe('hello world')
})

test('passes XMLHttpRequest to `onHeadersReceived` and response detail', async ({
  page
}) => {
  const result = await page.evaluate(async () => {
    let isXhr = false
    let readyState = -1
    const response = await window.lyla.get('/api/get-text', {
      hooks: {
        onHeadersReceived: [
          ({ originalRequest }) => {
            isXhr = originalRequest instanceof XMLHttpRequest
            readyState = originalRequest.readyState
          }
        ]
      }
    })
    return {
      isXhr,
      readyState,
      detailType: response.detail.type
    }
  })
  expect(result).toEqual({
    isXhr: true,
    readyState: 2,
    detailType: 'loadend'
  })
})

test('context is created for every request and shared by hooks', async ({
  page
}) => {
  const result = await page.evaluate(async () => {
    let count = 0
    const { lyla } = window.createLyla(
      {
        createContext: () => ({ id: ++count, steps: [] as string[] }),
        hooks: {
          onBeforeRequest: [
            (options) => {
              options.context.steps.push('before request')
              return options
            }
          ],
          onHeadersReceived: [
            ({ requestOptions }) => {
              requestOptions.context.steps.push('headers received')
            }
          ],
          onAfterResponse: [
            (response) => {
              response.context.steps.push('after response')
              return response
            }
          ]
        }
      },
      {
        createContext: (parent) => ({
          ...parent!.context,
          steps: [...parent!.context.steps, 'override']
        })
      }
    )
    const first = await lyla.get('/api/get-text')
    const second = await lyla.get('/api/get-text', {
      createContext: (parent) => ({
        ...parent!.context,
        steps: [...parent!.context.steps, 'request']
      })
    })
    const passed = { id: 100, steps: [] }
    const third = await lyla.get('/api/get-text', { context: passed })
    return {
      first: first.context,
      second: second.context,
      thirdIsPassed: third.context === passed,
      third: third.context,
      count
    }
  })
  const steps = ['before request', 'headers received', 'after response']
  expect(result.first).toEqual({ id: 1, steps: ['override', ...steps] })
  expect(result.second).toEqual({
    id: 2,
    steps: ['override', 'request', ...steps]
  })
  expect(result.thirdIsPassed).toBe(true)
  expect(result.third).toEqual({ id: 100, steps })
  expect(result.count).toBe(2)
})
