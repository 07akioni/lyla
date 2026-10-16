// @vitest-environment node
import {
  createLyla,
  isLylaError,
  isLylaErrorWithRetry,
  LYLA_ERROR
} from '@lylajs/core'
import type {
  LylaErrorWithRetry,
  LylaRequestOptions,
  LylaResponse
} from '@lylajs/core'
import { describe, expect, it, vi } from 'vitest'
import { catchError, createFakeAdapter, respond } from './utils'

type Context = { id: number }

/**
 * Responds with the statuses in order. A status of 0 means network error.
 */
function createSequenceAdapter(statuses: number[]) {
  let index = 0
  return createFakeAdapter((request) => {
    const status = statuses[Math.min(index++, statuses.length - 1)]
    setTimeout(() => {
      if (status === 0) {
        request.onNetworkError('network error')
      } else {
        respond(request, { status, body: JSON.stringify({ status }) })
      }
    })
  })
}

function createTestLyla(statuses: number[]) {
  let contextId = 0
  const fake = createSequenceAdapter(statuses)
  const createContext = vi.fn((): Context => ({ id: ++contextId }))
  const { lyla } = createLyla(fake.adapter, { createContext })
  return { ...fake, lyla, createContext }
}

const resolveResponse = async <C>({
  response
}: {
  response: LylaResponse<any, C>
}) => ({ action: 'resolve' as const, value: response })

const rejectError = async ({ error }: { error: unknown }) => ({
  action: 'reject' as const,
  value: error
})

describe('core retry', () => {
  it('throws non-lyla errors returned by onResolved reject action directly', async () => {
    const originalError = new Error('resolved reject')
    const { lyla } = createTestLyla([200])
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: async () => ({ action: 'reject', value: originalError }),
      onRejected: async () => ({
        action: 'reject',
        value: new Error('unexpected')
      }),
      onBrokenRetry: rejectError
    })
    await expect(lylaWithRetry.get('/')).rejects.toBe(originalError)
  })

  it('throws non-lyla errors returned by onRejected reject action directly', async () => {
    const originalError = new Error('rejected reject')
    const { lyla } = createTestLyla([0])
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected: async () => ({ action: 'reject', value: originalError }),
      onBrokenRetry: rejectError
    })
    await expect(lylaWithRetry.get('/')).rejects.toBe(originalError)
  })

  it('resolves without retrying when the first request succeeds', async () => {
    const { lyla, requests } = createTestLyla([200])
    const onRejected = vi.fn(rejectError)
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected,
      onBrokenRetry: rejectError
    })
    const response = await lylaWithRetry.get('/')
    expect(response.json).toEqual({ status: 200 })
    expect(requests).toHaveLength(1)
    expect(onRejected).not.toHaveBeenCalled()
  })

  it('retries rejected requests until they succeed', async () => {
    const { lyla, requests } = createTestLyla([0, 500, 200])
    const errorTypes: LYLA_ERROR[] = []
    const lylaWithRetry = lyla.withRetry({
      createState: () => ({ count: 0 }),
      onResolved: resolveResponse,
      onRejected: async ({ state, options, error }) => {
        if (isLylaError(error)) errorTypes.push(error.type)
        state.count++
        return state.count < 3
          ? { action: 'retry', value: () => options }
          : { action: 'reject', value: error }
      },
      onBrokenRetry: rejectError
    })
    const response = await lylaWithRetry.get('/')
    expect(response.status).toBe(200)
    expect(requests).toHaveLength(3)
    expect(errorTypes).toEqual([LYLA_ERROR.NETWORK, LYLA_ERROR.HTTP])
  })

  it('rejects with the last error when retry limit is reached', async () => {
    const { lyla, requests } = createTestLyla([500])
    const lylaWithRetry = lyla.withRetry({
      createState: () => ({ count: 0 }),
      onResolved: resolveResponse,
      onRejected: async ({ state, options, error }) =>
        ++state.count < 3
          ? { action: 'retry', value: () => options }
          : { action: 'reject', value: error },
      onBrokenRetry: rejectError
    })
    const error = await catchError(lylaWithRetry.get('/'))
    expect(isLylaError(error)).toBe(true)
    expect(requests).toHaveLength(3)
  })

  it('passes params to `onRejected` and `onResolved`', async () => {
    const { lyla } = createTestLyla([500, 200])
    const onRejected = vi.fn(
      async ({ options }: { options: LylaRequestOptions<Context> }) => ({
        action: 'retry' as const,
        value: () => options
      })
    )
    const onResolved = vi.fn(resolveResponse<Context>)
    const state = { name: 'state' }
    const lylaWithRetry = lyla.withRetry({
      createState: () => state,
      onResolved,
      onRejected,
      onBrokenRetry: rejectError
    })
    const response = await lylaWithRetry.post('/path', { json: { a: 1 } })
    expect(onRejected).toHaveBeenCalledTimes(1)
    const rejectedParams = onRejected.mock.calls[0][0] as any
    expect(rejectedParams.state).toBe(state)
    expect(rejectedParams.lyla).toBe(lyla)
    expect(rejectedParams.options).toEqual({
      method: 'post',
      url: '/path',
      json: { a: 1 }
    })
    expect(rejectedParams.context).toEqual({ id: 1 })
    expect(rejectedParams.error.type).toBe(LYLA_ERROR.HTTP)
    expect(rejectedParams.error.context).toBe(rejectedParams.context)

    expect(onResolved).toHaveBeenCalledTimes(1)
    const resolvedParams = onResolved.mock.calls[0][0] as any
    expect(resolvedParams.state).toBe(state)
    expect(resolvedParams.response).toBe(response)
    expect(resolvedParams.context).toEqual({ id: 2 })
    expect(resolvedParams.context).toBe(response.context)
  })

  it('creates state for every request', async () => {
    const { lyla } = createTestLyla([0, 200])
    const states: Array<{ id: number }> = []
    let stateId = 0
    const lylaWithRetry = lyla.withRetry({
      createState: () => {
        const state = { id: ++stateId }
        states.push(state)
        return state
      },
      onResolved: async ({ response, state }) => {
        expect(states).toContain(state)
        return { action: 'resolve', value: response }
      },
      onRejected: async ({ options }) => ({
        action: 'retry',
        value: () => options
      }),
      onBrokenRetry: rejectError
    })
    await Promise.all([lylaWithRetry.get('/'), lylaWithRetry.get('/')])
    expect(states).toEqual([{ id: 1 }, { id: 2 }])
  })

  it('retries with options returned by sync and async resolvers', async () => {
    const { lyla, requests } = createTestLyla([200])
    const lylaWithRetry = lyla.withRetry({
      createState: () => ({ count: 0 }),
      onResolved: async ({ state, options, response }) => {
        state.count++
        if (state.count === 1) {
          return {
            action: 'retry',
            value: () => ({ ...options, headers: { 'X-Retry': 1 } })
          }
        }
        if (state.count === 2) {
          return {
            action: 'retry',
            value: async () => ({ ...options, url: '/retried' })
          }
        }
        return { action: 'resolve', value: response }
      },
      onRejected: rejectError,
      onBrokenRetry: rejectError
    })
    await lylaWithRetry.get('/')
    expect(requests.map(({ url, headers }) => ({ url, headers }))).toEqual([
      { url: '/', headers: { accept: '*/*' } },
      { url: '/', headers: { 'x-retry': '1', accept: '*/*' } },
      { url: '/retried', headers: { 'x-retry': '1', accept: '*/*' } }
    ])
  })

  it('uses hooks of the base instance', async () => {
    const onBeforeRequest = vi.fn((options) => options)
    const { adapter } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: { onBeforeRequest: [onBeforeRequest] }
    })
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected: rejectError,
      onBrokenRetry: rejectError
    })
    await lylaWithRetry.get('/')
    expect(onBeforeRequest).toHaveBeenCalledTimes(1)
  })

  it.each([
    'get',
    'post',
    'put',
    'patch',
    'head',
    'delete',
    'options',
    'trace',
    'connect'
  ] as const)('`%s` shortcut sends request with method', async (method) => {
    const { lyla, requests } = createTestLyla([200])
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected: rejectError,
      onBrokenRetry: rejectError
    })
    await lylaWithRetry[method]('/path')
    expect(requests[0]).toMatchObject({
      method: method.toUpperCase(),
      url: '/path'
    })
  })

  it("can't call `withRetry` on an instance created by `withRetry`", () => {
    const { lyla } = createTestLyla([200])
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected: rejectError,
      onBrokenRetry: rejectError
    })
    expect(() =>
      lylaWithRetry.withRetry({
        createState: () => undefined,
        onResolved: resolveResponse,
        onRejected: rejectError,
        onBrokenRetry: rejectError
      })
    ).toThrowError(
      "Can't call `withRetry` on a lyla instance with created by `withRetry`"
    )
  })
})

describe('core retry context', () => {
  it('creates a new context for every attempt', async () => {
    const { lyla, createContext } = createTestLyla([500, 500, 200])
    const rejectedContexts: Context[] = []
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected: async ({ options, context, error }) => {
        rejectedContexts.push(context)
        expect((error as LylaErrorWithRetry).context).toBe(context)
        return { action: 'retry', value: () => options }
      },
      onBrokenRetry: rejectError
    })
    const response = await lylaWithRetry.get('/')
    expect(createContext).toHaveBeenCalledTimes(3)
    expect(rejectedContexts).toEqual([{ id: 1 }, { id: 2 }])
    expect(response.context).toEqual({ id: 3 })
  })

  it('reuses context passed by request options for every attempt', async () => {
    const { lyla, createContext } = createTestLyla([500, 200])
    const context: Context = { id: 100 }
    const rejectedContexts: Context[] = []
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected: async ({ options, context }) => {
        rejectedContexts.push(context)
        return { action: 'retry', value: () => options }
      },
      onBrokenRetry: rejectError
    })
    const response = await lylaWithRetry.get('/', { context })
    expect(createContext).not.toHaveBeenCalled()
    expect(rejectedContexts[0]).toBe(context)
    expect(response.context).toBe(context)
  })

  it('carries context to the next attempt through retry options', async () => {
    const { lyla } = createTestLyla([500, 200])
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected: async ({ options, context }) => ({
        action: 'retry',
        value: () => ({ ...options, context })
      }),
      onBrokenRetry: rejectError
    })
    const response = await lylaWithRetry.get('/')
    expect(response.context).toEqual({ id: 1 })
  })

  it('chains request `createContext` for every attempt', async () => {
    const { lyla } = createTestLyla([500, 200])
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected: async ({ options }) => ({
        action: 'retry',
        value: () => options
      }),
      onBrokenRetry: rejectError
    })
    const response = await lylaWithRetry.get('/', {
      createContext: (parent) => ({ id: parent!.context.id * 10 })
    })
    expect(response.context).toEqual({ id: 20 })
  })
})

describe('core retry errors', () => {
  it('passes errors raised before request is sent to `onRejected`', async () => {
    const { lyla, requests } = createTestLyla([200])
    const onRejected = vi.fn(rejectError)
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected,
      onBrokenRetry: rejectError
    })
    const error = await catchError(
      lylaWithRetry.get('/', {
        hooks: {
          onInit: [
            () => {
              throw new Error('init')
            }
          ]
        }
      })
    )
    expect(isLylaError(error)).toBe(true)
    expect((error as LylaErrorWithRetry).type).toBe(LYLA_ERROR.BROKEN_ON_INIT)
    expect(onRejected.mock.calls[0][0]).toMatchObject({
      error,
      context: { id: 1 }
    })
    expect(requests).toHaveLength(0)
  })

  it('passes undefined context to `onRejected` when context is never resolved', async () => {
    const { lyla } = createTestLyla([200])
    const onRejected = vi.fn(rejectError)
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected,
      onBrokenRetry: rejectError
    })
    const error = await catchError(
      lylaWithRetry.get('/', {
        context: { id: 0 },
        createContext: () => ({ id: 0 })
      })
    )
    expect((error as LylaErrorWithRetry).type).toBe(LYLA_ERROR.BAD_REQUEST)
    expect(onRejected.mock.calls[0][0]).toMatchObject({
      error,
      context: undefined
    })
  })

  it('passes custom errors rejected by hooks to `onRejected`', async () => {
    const reason = new Error('custom')
    const { adapter } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: {
        onAfterResponse: [
          (response, reject) => {
            reject(reason)
            return response
          }
        ]
      }
    })
    const onRejected = vi.fn(rejectError)
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected,
      onBrokenRetry: rejectError
    })
    await expect(lylaWithRetry.get('/')).rejects.toBe(reason)
    expect(onRejected.mock.calls[0][0].error).toBe(reason)
  })

  it('calls `onBrokenRetry` when `onRejected` throws', async () => {
    const thrown = new Error('onRejected')
    const { lyla } = createTestLyla([500])
    const onBrokenRetry = vi.fn(rejectError)
    const lylaWithRetry = lyla.withRetry({
      createState: () => 'state',
      onResolved: resolveResponse,
      onRejected: async () => {
        throw thrown
      },
      onBrokenRetry
    })
    const options = { url: '/path', query: { a: 1 } }
    const error = await catchError(lylaWithRetry(options))
    expect(onBrokenRetry).toHaveBeenCalledTimes(1)
    const params = onBrokenRetry.mock.calls[0][0] as any
    expect(params.error).toBe(error)
    expect(params.state).toBe('state')
    expect(params.lyla).toBe(lyla)
    expect(params.options).toBe(options)
    expect(params.context).toEqual({ id: 1 })

    const brokenRetryError = error as LylaErrorWithRetry
    expect(isLylaErrorWithRetry(brokenRetryError)).toBe(true)
    expect(isLylaError(brokenRetryError)).toBe(false)
    expect(brokenRetryError).toBeInstanceOf(Error)
    expect(brokenRetryError).toMatchObject({
      type: LYLA_ERROR.BROKEN_RETRY,
      name: 'LylaError[BROKEN_RETRY]',
      message: 'Retry process throws an unexpected error',
      isRetryError: true,
      error: thrown,
      context: { id: 1 },
      requestOptions: options,
      response: undefined,
      detail: undefined
    })
  })

  it('calls `onBrokenRetry` when `onResolved` throws and retries', async () => {
    const thrown = new Error('onResolved')
    const { lyla, requests } = createTestLyla([200])
    let resolvedCount = 0
    const onBrokenRetry = vi.fn(async ({ options }: any) => ({
      action: 'retry' as const,
      value: () => options
    }))
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: async ({ response }) => {
        if (++resolvedCount === 1) throw thrown
        return { action: 'resolve', value: response }
      },
      onRejected: rejectError,
      onBrokenRetry
    })
    const response = await lylaWithRetry.get('/')
    expect(response.context).toEqual({ id: 2 })
    expect(requests).toHaveLength(2)
    expect(onBrokenRetry).toHaveBeenCalledTimes(1)
    const params = onBrokenRetry.mock.calls[0][0]
    expect(params.error.type).toBe(LYLA_ERROR.BROKEN_RETRY)
    expect(params.error.error).toBe(thrown)
    expect(params.context).toEqual({ id: 1 })
  })

  it('calls `onBrokenRetry` with undefined context when options resolver throws', async () => {
    const thrown = new Error('resolver')
    const { lyla, requests } = createTestLyla([500])
    const onBrokenRetry = vi.fn(async () => ({
      action: 'reject' as const,
      value: 'rejected by onBrokenRetry'
    }))
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected: async () => ({
        action: 'retry',
        value: () => {
          throw thrown
        }
      }),
      onBrokenRetry
    })
    const options = { url: '/' }
    await expect(lylaWithRetry(options)).rejects.toBe(
      'rejected by onBrokenRetry'
    )
    expect(requests).toHaveLength(1)
    const params = (onBrokenRetry.mock.calls[0] as any[])[0]
    expect(params.context).toBeUndefined()
    expect(params.options).toBe(options)
    expect(params.error).toMatchObject({
      type: LYLA_ERROR.BROKEN_RETRY,
      error: thrown,
      context: undefined,
      requestOptions: options
    })
  })

  it('calls `onBrokenRetry` when async options resolver rejects', async () => {
    const thrown = new Error('resolver')
    const { lyla } = createTestLyla([500])
    const onBrokenRetry = vi.fn(rejectError)
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected: async () => ({
        action: 'retry',
        value: async () => {
          throw thrown
        }
      }),
      onBrokenRetry
    })
    const error = await catchError(lylaWithRetry.get('/'))
    expect((error as LylaErrorWithRetry).type).toBe(LYLA_ERROR.BROKEN_RETRY)
    expect((error as LylaErrorWithRetry).error).toBe(thrown)
  })

  it('rejects with the error thrown by `onBrokenRetry`', async () => {
    const thrown = new Error('onBrokenRetry')
    const { lyla } = createTestLyla([500])
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: resolveResponse,
      onRejected: async () => {
        throw new Error('onRejected')
      },
      onBrokenRetry: async () => {
        throw thrown
      }
    })
    await expect(lylaWithRetry.get('/')).rejects.toBe(thrown)
  })
})
