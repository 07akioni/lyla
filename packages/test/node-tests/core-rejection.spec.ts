// @vitest-environment node
/**
 * Unless a request is rejected manually by `reject` of hooks or the reject
 * action of `withRetry`, it's always rejected with a lyla error. A request
 * rejected manually is rejected with the reason as is.
 */
import {
  createLyla,
  isLylaError,
  isLylaErrorWithRetry,
  LylaAbortController,
  LYLA_ERROR
} from '@lylajs/core'
import type {
  Lyla,
  LylaAdapter,
  LylaAdapterMeta,
  LylaCreateOptions,
  LylaError,
  LylaErrorWithRetry,
  LylaResponse
} from '@lylajs/core'
import { describe, expect, it, vi } from 'vitest'
import type { FakeRequest } from './utils'
import { catchError, createFakeAdapter, respond, sleep } from './utils'

type Handle = (request: FakeRequest) => void | (() => void)

type LylaSetup = {
  handle?: Handle
  adapter?: LylaAdapter<LylaAdapterMeta>
  options?: LylaCreateOptions<null>
}

type Scenario = LylaSetup & {
  name: string
  type: LYLA_ERROR
  send?: (lyla: Lyla<null>) => Promise<unknown>
  /** Asserts the `error` field of the lyla error */
  error?: (error: unknown) => void
}

function createTestLyla({ handle, adapter, options }: LylaSetup = {}) {
  const fake = createFakeAdapter(handle)
  const { lyla } = createLyla(adapter ?? fake.adapter, {
    createContext: () => null,
    ...options
  })
  return { lyla, requests: fake.requests }
}

const respondWith =
  (status: number, body = ''): Handle =>
  (request) => {
    setTimeout(() => respond(request, { status, body }))
  }

const respondAfterHeaders: Handle = (request) => {
  setTimeout(() => {
    request.onHeadersReceived?.({}, undefined)
    respond(request)
  })
}

const neverRespond: Handle = () => {}

const getRoot = (lyla: Lyla<null>) => lyla.get('/')

function getThrown(fn: () => unknown): unknown {
  try {
    fn()
  } catch (e) {
    return e
  }
  throw new Error('Expected the function to throw')
}

const thrownByHook = new Error('thrown by hook')
const thrownByAdapter = new TypeError('Invalid URL')
const circular: Record<string, unknown> = {}
circular.self = circular

const isTypeError = (error: unknown) => expect(error).toBeInstanceOf(TypeError)
const isThrownByHook = (error: unknown) => expect(error).toBe(thrownByHook)

const scenarios: Scenario[] = [
  {
    name: 'status is not 2xx',
    type: LYLA_ERROR.HTTP,
    handle: respondWith(500)
  },
  {
    name: 'network error occurs',
    type: LYLA_ERROR.NETWORK,
    handle: (request) => {
      setTimeout(() => request.onNetworkError('detail'))
    }
  },
  {
    name: 'request times out',
    type: LYLA_ERROR.TIMEOUT,
    handle: neverRespond,
    send: (lyla) => lyla.get('/', { timeout: 10 })
  },
  {
    name: 'request is aborted',
    type: LYLA_ERROR.ABORTED,
    handle: neverRespond,
    send: (lyla) => {
      const controller = new LylaAbortController()
      setTimeout(() => controller.abort())
      return lyla.get('/', { signal: controller.signal })
    }
  },
  {
    name: 'signal is already aborted',
    type: LYLA_ERROR.ABORTED,
    send: (lyla) => {
      const controller = new AbortController()
      controller.abort()
      return lyla.get('/', { signal: controller.signal })
    }
  },
  {
    name: 'both `context` and `createContext` are set',
    type: LYLA_ERROR.BAD_REQUEST,
    send: (lyla) => lyla.get('/', { context: null, createContext: () => null })
  },
  {
    name: '`createContext` of instance throws',
    type: LYLA_ERROR.BAD_REQUEST,
    options: {
      createContext: () => {
        throw thrownByHook
      }
    },
    error: isThrownByHook
  },
  {
    name: '`createContext` of request throws',
    type: LYLA_ERROR.BAD_REQUEST,
    send: (lyla) =>
      lyla.get('/', {
        createContext: () => {
          throw thrownByHook
        }
      }),
    error: isThrownByHook
  },
  {
    name: '`query` is set when url contains `?`',
    type: LYLA_ERROR.BAD_REQUEST,
    send: (lyla) => lyla.get('/?a=1', { query: { b: 1 } })
  },
  {
    name: 'both `json` and `body` are set',
    type: LYLA_ERROR.BAD_REQUEST,
    send: (lyla) => lyla.post('/', { json: {}, body: 'body' })
  },
  {
    name: 'GET request has body',
    type: LYLA_ERROR.BAD_REQUEST,
    send: (lyla) => lyla.get('/', { body: 'body' })
  },
  {
    name: '`json` is circular',
    type: LYLA_ERROR.BAD_REQUEST,
    send: (lyla) => lyla.post('/', { json: circular }),
    error: isTypeError
  },
  {
    name: '`json` contains BigInt',
    type: LYLA_ERROR.BAD_REQUEST,
    send: (lyla) => lyla.post('/', { json: { id: BigInt(1) } }),
    error: isTypeError
  },
  {
    name: 'adapter throws',
    type: LYLA_ERROR.BAD_REQUEST,
    adapter: () => {
      throw thrownByAdapter
    },
    error: (error) => expect(error).toBe(thrownByAdapter)
  },
  {
    name: '`onInit` throws',
    type: LYLA_ERROR.BROKEN_ON_INIT,
    options: {
      hooks: {
        onInit: [
          () => {
            throw thrownByHook
          }
        ]
      }
    },
    error: isThrownByHook
  },
  {
    name: '`onInit` throws a value which is not an error',
    type: LYLA_ERROR.BROKEN_ON_INIT,
    options: {
      hooks: {
        onInit: [
          () => {
            throw 'reason'
          }
        ]
      }
    },
    error: (error) => expect(error).toBe('reason')
  },
  {
    name: '`onBeforeRequest` throws',
    type: LYLA_ERROR.BROKEN_ON_BEFORE_REQUEST,
    options: {
      hooks: {
        onBeforeRequest: [
          () => {
            throw thrownByHook
          }
        ]
      }
    },
    error: isThrownByHook
  },
  {
    name: '`onHeadersReceived` throws',
    type: LYLA_ERROR.BROKEN_ON_HEADERS_RECEIVED,
    handle: respondAfterHeaders,
    options: {
      hooks: {
        onHeadersReceived: [
          () => {
            throw thrownByHook
          }
        ]
      }
    },
    error: isThrownByHook
  },
  {
    name: '`onAfterResponse` throws',
    type: LYLA_ERROR.BROKEN_ON_AFTER_RESPONSE,
    options: {
      hooks: {
        onAfterResponse: [
          () => {
            throw thrownByHook
          }
        ]
      }
    },
    error: isThrownByHook
  },
  {
    name: '`onAfterResponse` reads invalid json',
    type: LYLA_ERROR.BROKEN_ON_AFTER_RESPONSE,
    handle: respondWith(200, '{'),
    options: {
      hooks: {
        onAfterResponse: [
          (response) => {
            void response.json
            return response
          }
        ]
      }
    },
    error: (error) => {
      expect(isLylaError(error) && error.type).toBe(LYLA_ERROR.INVALID_JSON)
    }
  },
  {
    name: '`onResponseError` throws',
    type: LYLA_ERROR.BROKEN_ON_RESPONSE_ERROR,
    handle: respondWith(500),
    options: {
      hooks: {
        onResponseError: [
          () => {
            throw thrownByHook
          }
        ]
      }
    },
    error: isThrownByHook
  },
  {
    name: '`onNonResponseError` throws before request is sent',
    type: LYLA_ERROR.BROKEN_ON_NON_RESPONSE_ERROR,
    options: {
      hooks: {
        onNonResponseError: [
          () => {
            throw thrownByHook
          }
        ]
      }
    },
    send: (lyla) => lyla.get('/', { body: 'body' }),
    error: isThrownByHook
  },
  {
    name: '`onNonResponseError` throws after `createContext` throws',
    type: LYLA_ERROR.BROKEN_ON_NON_RESPONSE_ERROR,
    options: {
      hooks: {
        onNonResponseError: [
          () => {
            throw thrownByHook
          }
        ]
      }
    },
    send: (lyla) =>
      lyla.get('/', {
        createContext: () => {
          throw new Error('create context')
        }
      }),
    error: isThrownByHook
  },
  {
    name: '`onNonResponseError` throws after request is sent',
    type: LYLA_ERROR.BROKEN_ON_NON_RESPONSE_ERROR,
    options: {
      hooks: {
        onAfterResponse: [
          () => {
            throw new Error('after response')
          }
        ],
        onNonResponseError: [
          () => {
            throw thrownByHook
          }
        ]
      }
    },
    error: isThrownByHook
  }
]

const existingLylaError = await catchError(
  createTestLyla().lyla.get('/', { body: 'body' })
)

const manualReasons: Array<[string, unknown]> = [
  ['an error', new Error('manual')],
  ['a string', 'manual'],
  ['undefined', undefined],
  ['null', null],
  ['a plain object', { code: 1 }],
  ['a lyla error', existingLylaError]
]

type ManualRejecter = LylaSetup & {
  name: string
  createOptions: (reason: unknown) => LylaCreateOptions<null>
}

const manualRejecters: ManualRejecter[] = [
  {
    name: '`reject` of `onHeadersReceived`',
    handle: respondAfterHeaders,
    createOptions: (reason) => ({
      hooks: { onHeadersReceived: [(_, reject) => reject(reason)] }
    })
  },
  {
    name: '`reject` of `onAfterResponse`',
    createOptions: (reason) => ({
      hooks: {
        onAfterResponse: [
          (response, reject) => {
            reject(reason)
            return response
          }
        ]
      }
    })
  },
  {
    name: '`reject` of async `onAfterResponse`',
    createOptions: (reason) => ({
      hooks: {
        onAfterResponse: [
          async (response, reject) => {
            await sleep(1)
            reject(reason)
            return response
          }
        ]
      }
    })
  },
  {
    name: '`reject` of `onResponseError`',
    handle: respondWith(500),
    createOptions: (reason) => ({
      hooks: { onResponseError: [(_, reject) => reject(reason)] }
    })
  }
]

const resolveResponse = async ({
  response
}: {
  response: LylaResponse<any, null>
}) => ({ action: 'resolve' as const, value: response })

const rejectError = async ({ error }: { error: unknown }) => ({
  action: 'reject' as const,
  value: error
})

describe('rejections without retry', () => {
  it.each(scenarios)(
    'rejects with `$type` when $name',
    async ({ send = getRoot, error: assertError, ...setup }) => {
      const { lyla } = createTestLyla(setup)
      const error = await catchError(send(lyla))
      expect(isLylaError(error)).toBe(true)
      expect(error).toBeInstanceOf(Error)
      expect((error as LylaError).type).toBe(setup.type)
      assertError?.((error as LylaError).error)
    }
  )

  it('throws lyla errors when reading json of a response', async () => {
    const { lyla } = createTestLyla({ handle: respondWith(200, '{') })
    const response = await lyla.get('/')
    const invalidJsonError = getThrown(() => response.json)
    expect(isLylaError(invalidJsonError)).toBe(true)
    expect((invalidJsonError as LylaError).type).toBe(LYLA_ERROR.INVALID_JSON)

    const arrayBufferResponse = await lyla.get('/', {
      responseType: 'arraybuffer'
    })
    const conversionError = getThrown(() => arrayBufferResponse.json)
    expect(isLylaError(conversionError)).toBe(true)
    expect((conversionError as LylaError).type).toBe(
      LYLA_ERROR.INVALID_CONVERSION
    )
  })

  describe.each(manualRejecters)('$name', ({ createOptions, ...setup }) => {
    it.each(manualReasons)('rejects with %s as is', async (_, reason) => {
      const { lyla } = createTestLyla({
        ...setup,
        options: createOptions(reason)
      })
      expect(await catchError(lyla.get('/'))).toBe(reason)
    })
  })
})

describe('rejections with retry', () => {
  it.each(scenarios)(
    'passes `$type` error to `onRejected` and rejects with it when $name',
    async ({ send = getRoot, ...setup }) => {
      const { lyla } = createTestLyla(setup)
      const onRejected = vi.fn(rejectError)
      const onBrokenRetry = vi.fn(rejectError)
      const lylaWithRetry = lyla.withRetry({
        createState: () => null,
        onResolved: resolveResponse,
        onRejected,
        onBrokenRetry
      })
      const error = await catchError(send(lylaWithRetry))
      expect(isLylaError(error)).toBe(true)
      expect((error as LylaError).type).toBe(setup.type)
      expect(onRejected).toHaveBeenCalledOnce()
      expect(onRejected.mock.calls[0][0].error).toBe(error)
      expect(onBrokenRetry).not.toHaveBeenCalled()
    }
  )

  describe.each(manualRejecters)(
    'request rejected by $name',
    ({ createOptions, ...setup }) => {
      it.each(manualReasons)(
        'passes %s to `onRejected` and rejects with it as is',
        async (_, reason) => {
          const { lyla } = createTestLyla({
            ...setup,
            options: createOptions(reason)
          })
          const onRejected = vi.fn(rejectError)
          const lylaWithRetry = lyla.withRetry({
            createState: () => null,
            onResolved: resolveResponse,
            onRejected,
            onBrokenRetry: rejectError
          })
          expect(await catchError(lylaWithRetry.get('/'))).toBe(reason)
          expect(onRejected.mock.calls[0][0].error).toBe(reason)
        }
      )
    }
  )

  describe.each([
    {
      name: 'reject action of `onResolved`',
      handle: undefined,
      createCallbacks: (reason: unknown) => ({
        onResolved: async () => ({ action: 'reject' as const, value: reason })
      })
    },
    {
      name: 'reject action of `onRejected`',
      handle: respondWith(500),
      createCallbacks: (reason: unknown) => ({
        onRejected: async () => ({ action: 'reject' as const, value: reason })
      })
    },
    {
      name: 'reject action of `onBrokenRetry`',
      handle: undefined,
      createCallbacks: (reason: unknown) => ({
        onResolved: async (): Promise<never> => {
          throw thrownByHook
        },
        onBrokenRetry: async () => ({ action: 'reject' as const, value: reason })
      })
    }
  ])('$name', ({ handle, createCallbacks }) => {
    it.each(manualReasons)('rejects with %s as is', async (_, reason) => {
      const { lyla } = createTestLyla({ handle })
      const lylaWithRetry = lyla.withRetry({
        createState: () => null,
        onResolved: resolveResponse,
        onRejected: rejectError,
        onBrokenRetry: rejectError,
        ...createCallbacks(reason)
      })
      expect(await catchError(lylaWithRetry.get('/'))).toBe(reason)
    })
  })

  it.each([
    {
      name: '`onResolved` throws',
      callbacks: {
        onResolved: async (): Promise<never> => {
          throw thrownByHook
        }
      },
      error: isThrownByHook
    },
    {
      name: '`onRejected` throws',
      handle: respondWith(500),
      callbacks: {
        onRejected: async (): Promise<never> => {
          throw thrownByHook
        }
      },
      error: isThrownByHook
    },
    {
      name: 'retry options resolver throws',
      callbacks: {
        onResolved: async () => ({
          action: 'retry' as const,
          value: () => {
            throw thrownByHook
          }
        })
      },
      error: isThrownByHook
    },
    {
      name: 'async retry options resolver rejects',
      callbacks: {
        onResolved: async () => ({
          action: 'retry' as const,
          value: async () => {
            throw thrownByHook
          }
        })
      },
      error: isThrownByHook
    },
    {
      name: '`createState` throws',
      callbacks: {
        createState: (): never => {
          throw thrownByHook
        }
      },
      error: isThrownByHook
    }
  ] satisfies Array<{
    name: string
    handle?: Handle
    callbacks: object
    error: (error: unknown) => void
  }>)(
    'passes `BROKEN_RETRY` error to `onBrokenRetry` when $name',
    async ({ handle, callbacks, error: assertError }) => {
      const { lyla } = createTestLyla({ handle })
      const onBrokenRetry = vi.fn(rejectError)
      const lylaWithRetry = lyla.withRetry({
        createState: () => null,
        onResolved: resolveResponse,
        onRejected: rejectError,
        onBrokenRetry,
        ...callbacks
      })
      const error = await catchError(lylaWithRetry.get('/'))
      expect(isLylaErrorWithRetry(error)).toBe(true)
      expect(isLylaError(error)).toBe(false)
      expect((error as LylaErrorWithRetry).type).toBe(LYLA_ERROR.BROKEN_RETRY)
      expect(onBrokenRetry).toHaveBeenCalledOnce()
      expect(onBrokenRetry.mock.calls[0][0].error).toBe(error)
      assertError((error as LylaErrorWithRetry).error)
    }
  )

  it('passes `undefined` context to `onRejected` when `createContext` throws', async () => {
    const { lyla, requests } = createTestLyla()
    const onRejected = vi.fn((params: { context: unknown; error: unknown }) =>
      rejectError(params)
    )
    const lylaWithRetry = lyla.withRetry({
      createState: () => null,
      onResolved: resolveResponse,
      onRejected,
      onBrokenRetry: rejectError
    })
    await catchError(
      lylaWithRetry.get('/', {
        createContext: () => {
          throw thrownByHook
        }
      })
    )
    expect(onRejected.mock.calls[0][0].context).toBeUndefined()
    expect(requests).toHaveLength(0)
  })

  it('passes `undefined` state to `onBrokenRetry` when `createState` throws', async () => {
    const { lyla, requests } = createTestLyla()
    const onBrokenRetry = vi.fn(
      (params: {
        state: unknown
        context: unknown
        options: unknown
        error: unknown
      }) => rejectError(params)
    )
    const lylaWithRetry = lyla.withRetry({
      createState: (): never => {
        throw thrownByHook
      },
      onResolved: resolveResponse,
      onRejected: rejectError,
      onBrokenRetry
    })
    const options = { headers: { a: 'a' } }
    await catchError(lylaWithRetry.get('/', options))
    const params = onBrokenRetry.mock.calls[0][0]
    expect(params.state).toBeUndefined()
    expect(params.context).toBeUndefined()
    expect(params.options).toMatchObject(options)
    expect(requests).toHaveLength(0)
  })

  it('creates state again when `onBrokenRetry` retries after `createState` throws', async () => {
    const { lyla, requests } = createTestLyla()
    const createState = vi
      .fn((): { count: number } => ({ count: 0 }))
      .mockImplementationOnce(() => {
        throw thrownByHook
      })
    const onResolved = vi.fn(
      (params: { state: unknown; response: LylaResponse<any, null> }) =>
        resolveResponse(params)
    )
    const lylaWithRetry = lyla.withRetry({
      createState,
      onResolved,
      onRejected: rejectError,
      onBrokenRetry: async ({ options }) => ({
        action: 'retry',
        value: () => ({ ...options, url: '/retried' })
      })
    })
    await lylaWithRetry.get('/')
    expect(createState).toHaveBeenCalledTimes(2)
    expect(onResolved.mock.calls[0][0].state).toEqual({ count: 0 })
    expect(requests.map((request) => request.url)).toEqual(['/retried'])
  })
})
