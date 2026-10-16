import { expect, test } from '@playwright/test'
import { LYLA_ERROR } from '@lylajs/web'
import { beforeEach, trackRequests, uniqueId } from './utils'
import './types'

beforeEach(test)

test('retries until the request succeeds with a new context for every attempt', async ({
  page
}) => {
  const id = uniqueId()
  const { sent } = trackRequests(page, id)
  const result = await page.evaluate(async (id) => {
    let contextId = 0
    const { lyla } = window.createLyla({
      createContext: () => ({ id: ++contextId })
    })
    const rejectedContexts: number[] = []
    const lylaWithRetry = lyla.withRetry({
      createState: () => ({ count: 0 }),
      onResolved: async ({ response }) => ({
        action: 'resolve',
        value: response
      }),
      onRejected: async ({ state, options, context, error }) => {
        rejectedContexts.push(context!.id)
        if (
          window.isLylaError(error) &&
          error.type === window.LYLA_ERROR.HTTP &&
          error.response.status === 503 &&
          ++state.count < 3
        ) {
          return { action: 'retry', value: () => options }
        }
        return { action: 'reject', value: error }
      },
      onBrokenRetry: async ({ error }) => ({ action: 'reject', value: error })
    })
    const response = await lylaWithRetry.get<{ attempt: number }>(
      '/api/flaky',
      { query: { id, fail: 2 } }
    )
    return {
      attempt: response.json.attempt,
      context: response.context.id,
      rejectedContexts
    }
  }, id)
  expect(result).toEqual({ attempt: 3, context: 3, rejectedContexts: [1, 2] })
  expect(sent).toHaveLength(3)
})

test('rejects with the last error when retry limit is reached', async ({
  page
}) => {
  const id = uniqueId()
  const { sent } = trackRequests(page, id)
  const result = await page.evaluate(async (id) => {
    const lylaWithRetry = window.lyla.withRetry({
      createState: () => ({ count: 0 }),
      onResolved: async ({ response }) => ({
        action: 'resolve',
        value: response
      }),
      onRejected: async ({ state, options, error }) =>
        ++state.count < 3
          ? { action: 'retry', value: () => options }
          : { action: 'reject', value: error },
      onBrokenRetry: async ({ error }) => ({ action: 'reject', value: error })
    })
    try {
      await lylaWithRetry.get('/api/flaky', { query: { id, fail: 10 } })
    } catch (e) {
      if (window.isLylaError(e) && e.type === window.LYLA_ERROR.HTTP) {
        return { type: e.type, attempt: e.response.json.attempt }
      }
    }
    return undefined
  }, id)
  expect(result).toEqual({ type: LYLA_ERROR.HTTP, attempt: 3 })
  expect(sent).toHaveLength(3)
})

test('retries timed out request with new options', async ({ page }) => {
  const { sent, failed } = trackRequests(page, '/api/delay')
  const result = await page.evaluate(async () => {
    const errorTypes: string[] = []
    const lylaWithRetry = window.lyla.withRetry({
      createState: () => undefined,
      onResolved: async ({ response }) => ({
        action: 'resolve',
        value: response
      }),
      onRejected: async ({ options, error }) => {
        if (window.isLylaError(error)) errorTypes.push(error.type)
        if (
          window.isLylaError(error) &&
          error.type === window.LYLA_ERROR.TIMEOUT
        ) {
          return {
            action: 'retry',
            value: async () => ({ ...options, timeout: 5000 })
          }
        }
        return { action: 'reject', value: error }
      },
      onBrokenRetry: async ({ error }) => ({ action: 'reject', value: error })
    })
    const response = await lylaWithRetry.get('/api/delay', {
      query: { ms: 300 },
      timeout: 50
    })
    return {
      body: response.body,
      timeout: response.requestOptions.timeout,
      errorTypes
    }
  })
  expect(result).toEqual({
    body: 'delayed',
    timeout: 5000,
    errorTypes: [LYLA_ERROR.TIMEOUT]
  })
  expect(sent).toHaveLength(2)
  expect(failed).toEqual(['net::ERR_ABORTED'])
})

test('reuses context passed by request options for every attempt', async ({
  page
}) => {
  const id = uniqueId()
  const result = await page.evaluate(async (id) => {
    const { lyla } = window.createLyla({
      createContext: () => ({ attempts: [] as number[] })
    })
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: async ({ response }) => ({
        action: 'resolve',
        value: response
      }),
      onRejected: async ({ options, context, error }) => {
        if (window.isLylaError(error) && error.type === window.LYLA_ERROR.HTTP) {
          context!.attempts.push(error.response.json.attempt)
          return { action: 'retry', value: () => options }
        }
        return { action: 'reject', value: error }
      },
      onBrokenRetry: async ({ error }) => ({ action: 'reject', value: error })
    })
    const context = { attempts: [] as number[] }
    const response = await lylaWithRetry.get('/api/flaky', {
      query: { id, fail: 2 },
      context
    })
    return {
      same: response.context === context,
      attempts: context.attempts
    }
  }, id)
  expect(result).toEqual({ same: true, attempts: [1, 2] })
})

test('rejects with BROKEN_RETRY error when retry callbacks throw', async ({
  page
}) => {
  const result = await page.evaluate(async () => {
    const lylaWithRetry = window.lyla.withRetry({
      createState: () => undefined,
      onResolved: async () => {
        throw new Error('onResolved')
      },
      onRejected: async () => {
        throw new Error('onRejected')
      },
      onBrokenRetry: async ({ error }) => ({ action: 'reject', value: error })
    })
    const results = []
    for (const url of ['/api/get-text', '/api/status/500']) {
      try {
        await lylaWithRetry.get(url)
      } catch (e) {
        results.push({
          isLylaError: window.isLylaError(e),
          isLylaErrorWithRetry: window.isLylaErrorWithRetry(e),
          type: window.isLylaErrorWithRetry(e) ? e.type : undefined,
          message: window.isLylaErrorWithRetry(e)
            ? (e.error as Error).message
            : undefined
        })
      }
    }
    return results
  })
  expect(result).toEqual([
    {
      isLylaError: false,
      isLylaErrorWithRetry: true,
      type: LYLA_ERROR.BROKEN_RETRY,
      message: 'onResolved'
    },
    {
      isLylaError: false,
      isLylaErrorWithRetry: true,
      type: LYLA_ERROR.BROKEN_RETRY,
      message: 'onRejected'
    }
  ])
})
