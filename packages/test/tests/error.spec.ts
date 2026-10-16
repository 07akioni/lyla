import { expect, test } from '@playwright/test'
import { LYLA_ERROR } from '@lylajs/web'
import { beforeEach, trackRequests } from './utils'
import './types'

beforeEach(test)

for (const status of [400, 401, 403, 404, 500, 503]) {
  test(`rejects with HTTP error for status ${status}`, async ({ page }) => {
    const result = await page.evaluate(async (status) => {
      const hookErrorTypes: string[] = []
      try {
        await window.lyla.get(`/api/status/${status}`, {
          hooks: {
            onResponseError: [(error) => void hookErrorTypes.push(error.type)],
            onNonResponseError: [
              (error) => void hookErrorTypes.push(`non response ${error.type}`)
            ]
          }
        })
      } catch (e) {
        if (window.isLylaError(e) && e.type === window.LYLA_ERROR.HTTP) {
          return {
            type: e.type,
            message: e.message,
            status: e.response.status,
            statusText: e.response.statusText,
            header: e.response.headers['x-status'],
            json: e.response.json,
            hookErrorTypes
          }
        }
      }
      return undefined
    }, status)
    expect(result).toMatchObject({
      type: LYLA_ERROR.HTTP,
      status,
      header: String(status),
      json: { status },
      hookErrorTypes: [LYLA_ERROR.HTTP]
    })
    expect(result!.message).toBe(
      `Request failed with ${status} ${result!.statusText}`
    )
  })
}

test('rejects with TIMEOUT error and cancels the request', async ({ page }) => {
  const { failed } = trackRequests(page, '/api/delay')
  const result = await page.evaluate(async () => {
    const start = Date.now()
    const hookErrorTypes: string[] = []
    try {
      await window.lyla.get('/api/delay', {
        query: { ms: 3000 },
        timeout: 200,
        hooks: {
          onResponseError: [(error) => void hookErrorTypes.push(error.type)]
        }
      })
    } catch (e) {
      if (window.isLylaError(e)) {
        return {
          type: e.type,
          message: e.message,
          elapsed: Date.now() - start,
          hookErrorTypes
        }
      }
    }
    return undefined
  })
  expect(result).toMatchObject({
    type: LYLA_ERROR.TIMEOUT,
    message: 'Timeout of 200ms exceeded',
    hookErrorTypes: [LYLA_ERROR.TIMEOUT]
  })
  expect(result!.elapsed).toBeLessThan(2000)
  await expect.poll(() => failed).toEqual(['net::ERR_ABORTED'])
})

test('resolves when response arrives before timeout', async ({ page }) => {
  const body = await page.evaluate(async () => {
    return (
      await window.lyla.get('/api/delay', { query: { ms: 50 }, timeout: 3000 })
    ).body
  })
  expect(body).toBe('delayed')
})

test('rejects with reason passed to `reject` of `onResponseError` on timeout', async ({
  page
}) => {
  const reason = await page.evaluate(async () => {
    try {
      await window.lyla.get('/api/delay', {
        query: { ms: 3000 },
        timeout: 100,
        hooks: {
          onResponseError: [
            (error, reject) => reject(`custom ${error.type}`)
          ]
        }
      })
    } catch (e) {
      return e
    }
    return undefined
  })
  expect(reason).toBe(`custom ${LYLA_ERROR.TIMEOUT}`)
})

for (const type of ['AbortController', 'LylaAbortController'] as const) {
  test(`rejects with ABORTED error when ${type} aborts in flight`, async ({
    page
  }) => {
    const { failed } = trackRequests(page, '/api/delay')
    const errorType = await page.evaluate(async (type) => {
      const controller =
        type === 'AbortController'
          ? new AbortController()
          : new window.LylaAbortController()
      setTimeout(() => controller.abort(), 100)
      try {
        await window.lyla.get('/api/delay', {
          query: { ms: 3000 },
          signal: controller.signal
        })
      } catch (e) {
        if (window.isLylaError(e)) return e.type
      }
      return undefined
    }, type)
    expect(errorType).toBe(LYLA_ERROR.ABORTED)
    await expect.poll(() => failed).toEqual(['net::ERR_ABORTED'])
  })
}

test("doesn't send request when signal is already aborted", async ({
  page
}) => {
  const { sent } = trackRequests(page, '/api/echo')
  const errorType = await page.evaluate(async () => {
    const controller = new AbortController()
    controller.abort()
    try {
      await window.lyla.get('/api/echo', { signal: controller.signal })
    } catch (e) {
      if (window.isLylaError(e)) return e.type
    }
    return undefined
  })
  await page.waitForTimeout(100)
  expect(errorType).toBe(LYLA_ERROR.ABORTED)
  expect(sent).toEqual([])
})

test('rejects with NETWORK error when server is unreachable', async ({
  page
}) => {
  const result = await page.evaluate(async () => {
    try {
      await window.lyla.get('http://localhost:8099/api/echo')
    } catch (e) {
      if (window.isLylaError(e) && e.type === window.LYLA_ERROR.NETWORK) {
        return {
          type: e.type,
          detailType: e.detail.type,
          response: e.response
        }
      }
    }
    return undefined
  })
  expect(result).toEqual({
    type: LYLA_ERROR.NETWORK,
    detailType: 'error',
    response: undefined
  })
})

test('rejects with NETWORK error when CORS is not allowed', async ({ page }) => {
  const errorType = await page.evaluate(async () => {
    try {
      await window.lyla.put('http://localhost:8092/api/get-text')
    } catch (e) {
      if (window.isLylaError(e)) return e.type
    }
    return undefined
  })
  expect(errorType).toBe(LYLA_ERROR.NETWORK)
})

test("doesn't send request when it fails before being sent", async ({
  page
}) => {
  const { sent } = trackRequests(page, '/api/echo')
  const results = await page.evaluate(async () => {
    const { lyla } = window.createLyla<string | undefined>({
      createContext: () => undefined
    })
    const results: Array<[string, string | undefined, string[]]> = []
    const cases: Array<[string, Parameters<typeof lyla>[0]]> = [
      ['query with ?', { url: '/api/echo?a=1', query: { b: 2 } }],
      ['GET with body', { url: '/api/echo', body: 'body' }],
      ['json with body', { url: '/api/echo', method: 'POST', json: {}, body: '' }],
      [
        'onInit throws',
        {
          url: '/api/echo',
          hooks: {
            onInit: [
              () => {
                throw new Error('init')
              }
            ]
          }
        }
      ],
      [
        'onBeforeRequest throws',
        {
          url: '/api/echo',
          hooks: {
            onBeforeRequest: [
              () => {
                throw new Error('before request')
              }
            ]
          }
        }
      ],
      [
        'context with createContext',
        { url: '/api/echo', context: 'context', createContext: () => 'created' }
      ]
    ]
    for (const [name, options] of cases) {
      const hookErrors: string[] = []
      try {
        await lyla({
          ...options,
          hooks: {
            ...options.hooks,
            onNonResponseError: [(error) => void hookErrors.push(error.type)]
          }
        })
        results.push([name, undefined, hookErrors])
      } catch (e) {
        results.push([
          name,
          window.isLylaError(e) ? e.type : String(e),
          hookErrors
        ])
      }
    }
    return results
  })
  await page.waitForTimeout(100)
  expect(results).toEqual([
    ['query with ?', LYLA_ERROR.BAD_REQUEST, [LYLA_ERROR.BAD_REQUEST]],
    ['GET with body', LYLA_ERROR.BAD_REQUEST, [LYLA_ERROR.BAD_REQUEST]],
    ['json with body', LYLA_ERROR.BAD_REQUEST, [LYLA_ERROR.BAD_REQUEST]],
    [
      'onInit throws',
      LYLA_ERROR.BROKEN_ON_INIT,
      [LYLA_ERROR.BROKEN_ON_INIT]
    ],
    [
      'onBeforeRequest throws',
      LYLA_ERROR.BROKEN_ON_BEFORE_REQUEST,
      [LYLA_ERROR.BROKEN_ON_BEFORE_REQUEST]
    ],
    [
      'context with createContext',
      LYLA_ERROR.BAD_REQUEST,
      [LYLA_ERROR.BAD_REQUEST]
    ]
  ])
  expect(sent).toEqual([])
})

test('rejects when hooks throw after response is received', async ({
  page
}) => {
  const results = await page.evaluate(async () => {
    const results: string[] = []
    const throwError = () => {
      throw new Error('hook')
    }
    for (const hooks of [
      { onHeadersReceived: [throwError] },
      { onAfterResponse: [throwError] }
    ]) {
      try {
        await window.lyla.get('/api/get-text', { hooks })
      } catch (e) {
        if (window.isLylaError(e)) {
          results.push(`${e.type} ${(e.error as Error).message}`)
        }
      }
    }
    return results
  })
  expect(results).toEqual([
    `${LYLA_ERROR.BROKEN_ON_HEADERS_RECEIVED} hook`,
    `${LYLA_ERROR.BROKEN_ON_AFTER_RESPONSE} hook`
  ])
})

test('calls `onNonResponseError` when json is invalid', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const hookErrors: unknown[] = []
    const response = await window.lyla.get('/api/get-text', {
      hooks: {
        onNonResponseError: [(error) => void hookErrors.push(error)]
      }
    })
    let thrown: unknown
    try {
      response.json
    } catch (e) {
      thrown = e
    }
    await new Promise((resolve) => setTimeout(resolve))
    return {
      type: window.isLylaError(thrown) ? thrown.type : undefined,
      isSyntaxError:
        window.isLylaError(thrown) && thrown.error instanceof SyntaxError,
      sameError: hookErrors.length === 1 && hookErrors[0] === thrown
    }
  })
  expect(result).toEqual({
    type: LYLA_ERROR.INVALID_JSON,
    isSyntaxError: true,
    sameError: true
  })
})
