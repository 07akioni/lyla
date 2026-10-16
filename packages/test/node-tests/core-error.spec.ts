// @vitest-environment node
import {
  createLyla,
  isLylaError,
  isLylaErrorWithRetry,
  LYLA_ERROR
} from '@lylajs/core'
import type { LylaError, LylaRequestOptions } from '@lylajs/core'
import { describe, expect, it, vi } from 'vitest'
import { catchError, createFakeAdapter, respond, sleep } from './utils'

function createErrorHooks() {
  const responseErrors: LylaError[] = []
  const nonResponseErrors: LylaError[] = []
  return {
    responseErrors,
    nonResponseErrors,
    hooks: {
      onResponseError: [
        (error: LylaError) => {
          responseErrors.push(error)
        }
      ],
      onNonResponseError: [
        (error: LylaError) => {
          nonResponseErrors.push(error)
        }
      ]
    }
  }
}

describe('core response errors', () => {
  it('rejects with `HTTP` error for non 2xx status', async () => {
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() =>
        respond(request, {
          status: 404,
          headers: { 'X-Error': 'value' },
          body: '{"message":"not found"}'
        })
      )
    })
    const { hooks, responseErrors, nonResponseErrors } = createErrorHooks()
    const { lyla } = createLyla(adapter, {
      createContext: () => 'context',
      hooks
    })
    const error = (await catchError(lyla.get('/users'))) as LylaError
    expect(isLylaError(error)).toBe(true)
    expect(error).toBeInstanceOf(Error)
    expect(error.type).toBe(LYLA_ERROR.HTTP)
    expect(error.name).toBe('LylaError[HTTP]')
    expect(error.message).toBe('Request failed with 404 Not Found')
    expect(error.context).toBe('context')
    expect(error.requestOptions).toMatchObject({ url: '/users', method: 'GET' })
    expect(error.response).toMatchObject({
      status: 404,
      statusText: 'Not Found',
      headers: { 'x-error': 'value' },
      context: 'context'
    })
    expect(error.response?.json).toEqual({ message: 'not found' })
    expect(responseErrors).toEqual([error])
    expect(nonResponseErrors).toEqual([])
  })

  it.each([199, 300, 500])('rejects with `HTTP` error for status %i', async (status) => {
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => respond(request, { status }))
    })
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    const error = (await catchError(lyla.get('/'))) as LylaError
    expect(error.type).toBe(LYLA_ERROR.HTTP)
    expect(error.response?.status).toBe(status)
  })

  it('rejects with `NETWORK` error', async () => {
    const detail = new Error('network detail')
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => request.onNetworkError(detail))
    })
    const { hooks, responseErrors, nonResponseErrors } = createErrorHooks()
    const { lyla } = createLyla(adapter, {
      createContext: () => 'context',
      hooks
    })
    const error = (await catchError(lyla.get('/'))) as LylaError
    expect(error.type).toBe(LYLA_ERROR.NETWORK)
    expect(error.detail).toBe(detail)
    expect(error.response).toBeUndefined()
    expect(error.context).toBe('context')
    expect(responseErrors).toEqual([error])
    expect(nonResponseErrors).toEqual([])
  })

  it('ignores response after network error', async () => {
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => {
        request.onNetworkError(undefined)
        request.onHeadersReceived?.({}, undefined)
        respond(request)
      })
    })
    const onHeadersReceived = vi.fn()
    const onAfterResponse = vi.fn((response) => response)
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: {
        onHeadersReceived: [onHeadersReceived],
        onAfterResponse: [onAfterResponse]
      }
    })
    const error = (await catchError(lyla.get('/'))) as LylaError
    expect(error.type).toBe(LYLA_ERROR.NETWORK)
    expect(onHeadersReceived).not.toHaveBeenCalled()
    expect(onAfterResponse).not.toHaveBeenCalled()
  })

  it('rejects with `TIMEOUT` error and aborts adapter', async () => {
    const { adapter, getAbortCount } = createFakeAdapter(() => {})
    const { hooks, responseErrors } = createErrorHooks()
    const { lyla } = createLyla(adapter, {
      createContext: () => 'context',
      hooks
    })
    const error = (await catchError(lyla.get('/', { timeout: 5 }))) as LylaError
    expect(error.type).toBe(LYLA_ERROR.TIMEOUT)
    expect(error.message).toBe('Timeout of 5ms exceeded')
    expect(error.context).toBe('context')
    expect(getAbortCount()).toBe(1)
    expect(responseErrors).toEqual([error])
  })

  it('keeps `TIMEOUT` error when abort triggers adapter callbacks', async () => {
    const { adapter } = createFakeAdapter((request) => () => {
      request.onNetworkError(new Error('aborted'))
      respond(request, { status: 0 })
    })
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    const error = (await catchError(lyla.get('/', { timeout: 1 }))) as LylaError
    expect(error.type).toBe(LYLA_ERROR.TIMEOUT)
  })

  it("doesn't time out when response arrives in time", async () => {
    const { adapter, getAbortCount } = createFakeAdapter()
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    await lyla.get('/', { timeout: 20 })
    await sleep(30)
    expect(getAbortCount()).toBe(0)
  })

  it('rejects with reason passed to `reject` of `onResponseError`', async () => {
    const reason = new Error('custom')
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => respond(request, { status: 500 }))
    })
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: {
        onResponseError: [(_, reject) => reject(reason)]
      }
    })
    await expect(lyla.get('/')).rejects.toBe(reason)
  })

  it('waits for async `onResponseError`', async () => {
    const calls: string[] = []
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => respond(request, { status: 500 }))
    })
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: {
        onResponseError: [
          async () => {
            await sleep(5)
            calls.push('hook')
          }
        ]
      }
    })
    await catchError(lyla.get('/'))
    calls.push('rejected')
    expect(calls).toEqual(['hook', 'rejected'])
  })

  it('rejects with `BROKEN_ON_RESPONSE_ERROR` when `onResponseError` throws', async () => {
    const hookError = new Error('hook')
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => respond(request, { status: 500 }))
    })
    const nonResponseErrors: LylaError[] = []
    const { lyla } = createLyla(adapter, {
      createContext: () => 'context',
      hooks: {
        onResponseError: [
          () => {
            throw hookError
          }
        ],
        onNonResponseError: [(error) => void nonResponseErrors.push(error)]
      }
    })
    const error = (await catchError(lyla.get('/'))) as LylaError
    expect(error.type).toBe(LYLA_ERROR.BROKEN_ON_RESPONSE_ERROR)
    expect(error.error).toBe(hookError)
    expect(error.context).toBe('context')
    expect(nonResponseErrors).toEqual([error])
  })
})

describe('core hook errors after request is sent', () => {
  it('rejects with `BROKEN_ON_HEADERS_RECEIVED` when `onHeadersReceived` throws', async () => {
    const hookError = new Error('hook')
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => request.onHeadersReceived?.({}, undefined))
    })
    const { hooks, nonResponseErrors } = createErrorHooks()
    const { lyla } = createLyla(adapter, {
      createContext: () => 'context',
      hooks: {
        ...hooks,
        onHeadersReceived: [
          () => {
            throw hookError
          }
        ]
      }
    })
    const error = (await catchError(lyla.get('/'))) as LylaError
    expect(error.type).toBe(LYLA_ERROR.BROKEN_ON_HEADERS_RECEIVED)
    expect(error.error).toBe(hookError)
    expect(error.context).toBe('context')
    expect(nonResponseErrors).toEqual([error])
  })

  it('rejects with reason passed to `reject` of `onHeadersReceived`', async () => {
    const reason = new Error('custom')
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => {
        request.onHeadersReceived?.({}, undefined)
        respond(request)
      })
    })
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: {
        onHeadersReceived: [(_, reject) => reject(reason)]
      }
    })
    await expect(lyla.get('/')).rejects.toBe(reason)
  })

  it('rejects with `BROKEN_ON_AFTER_RESPONSE` when `onAfterResponse` throws', async () => {
    const hookError = new Error('hook')
    const { adapter } = createFakeAdapter()
    const { hooks, nonResponseErrors } = createErrorHooks()
    const { lyla } = createLyla(adapter, {
      createContext: () => 'context',
      hooks: {
        ...hooks,
        onAfterResponse: [
          async () => {
            throw hookError
          }
        ]
      }
    })
    const error = (await catchError(lyla.get('/'))) as LylaError
    expect(error.type).toBe(LYLA_ERROR.BROKEN_ON_AFTER_RESPONSE)
    expect(error.error).toBe(hookError)
    expect(error.response?.status).toBe(200)
    expect(error.context).toBe('context')
    expect(nonResponseErrors).toEqual([error])
  })

  it('rejects with reason passed to `reject` of `onAfterResponse`', async () => {
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
    await expect(lyla.get('/')).rejects.toBe(reason)
  })

  it('rejects with `BROKEN_ON_NON_RESPONSE_ERROR` when `onNonResponseError` throws after request is sent', async () => {
    const hookError = new Error('non response hook')
    const { adapter } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: {
        onAfterResponse: [
          () => {
            throw new Error('after response hook')
          }
        ],
        onNonResponseError: [
          () => {
            throw hookError
          }
        ]
      }
    })
    const error = (await catchError(lyla.get('/'))) as LylaError
    expect(error.type).toBe(LYLA_ERROR.BROKEN_ON_NON_RESPONSE_ERROR)
    expect(error.error).toBe(hookError)
  })
})

describe('core json errors', () => {
  it.each(['', 'not json', '{"a":'])(
    'throws `INVALID_JSON` when accessing json of body %j',
    async (body) => {
      const { adapter } = createFakeAdapter((request) => {
        setTimeout(() => respond(request, { body }))
      })
      const { hooks, nonResponseErrors } = createErrorHooks()
      const { lyla } = createLyla(adapter, {
        createContext: () => 'context',
        hooks
      })
      const response = await lyla.get('/')
      let error: LylaError | undefined
      try {
        response.json
      } catch (e) {
        error = e as LylaError
      }
      expect(isLylaError(error)).toBe(true)
      expect(error!.type).toBe(LYLA_ERROR.INVALID_JSON)
      expect(error!.error).toBeInstanceOf(SyntaxError)
      expect(error!.response).toBe(response)
      expect(error!.context).toBe('context')
      await sleep(0)
      expect(nonResponseErrors).toEqual([error])
    }
  )

  it.each(['arraybuffer', 'blob'] as const)(
    'throws `INVALID_CONVERSION` when accessing json with responseType %s',
    async (responseType) => {
      const { adapter } = createFakeAdapter((request) => {
        setTimeout(() => respond(request, { body: new ArrayBuffer(0) }))
      })
      const { hooks, nonResponseErrors } = createErrorHooks()
      const { lyla } = createLyla(adapter, {
        createContext: () => undefined,
        hooks
      })
      const response = await lyla.get('/', { responseType })
      let error: LylaError | undefined
      try {
        response.json
      } catch (e) {
        error = e as LylaError
      }
      expect(error!.type).toBe(LYLA_ERROR.INVALID_CONVERSION)
      expect(error!.message).toBe(`Can not convert ${responseType} to JSON`)
      expect(error!.response).toBe(response)
      await sleep(0)
      expect(nonResponseErrors).toEqual([error])
    }
  )

  it("doesn't throw when json is set before accessing", async () => {
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => respond(request, { body: 'not json' }))
    })
    const { lyla } = createLyla(adapter, { createContext: () => undefined })
    const response = await lyla.get('/')
    response.json = 'value'
    expect(response.json).toBe('value')
  })
})

describe('core errors before request is sent', () => {
  function createTestLyla(onNonResponseError: (error: LylaError) => void) {
    const { adapter, requests } = createFakeAdapter()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: {
        onNonResponseError: [onNonResponseError]
      }
    })
    return { lyla, requests }
  }

  const cases: Array<[string, LYLA_ERROR, LylaRequestOptions]> = [
    [
      '`onInit` throws',
      LYLA_ERROR.BROKEN_ON_INIT,
      {
        url: '/',
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
      'async `onInit` rejects',
      LYLA_ERROR.BROKEN_ON_INIT,
      {
        url: '/',
        hooks: {
          onInit: [
            async () => {
              throw new Error('init')
            }
          ]
        }
      }
    ],
    [
      '`query` is used with url containing `?`',
      LYLA_ERROR.BAD_REQUEST,
      { url: '/?foo=bar', query: { foo: 'bar' } }
    ],
    [
      '`onBeforeRequest` throws',
      LYLA_ERROR.BROKEN_ON_BEFORE_REQUEST,
      {
        url: '/',
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
      'async `onBeforeRequest` rejects',
      LYLA_ERROR.BROKEN_ON_BEFORE_REQUEST,
      {
        url: '/',
        hooks: {
          onBeforeRequest: [
            async () => {
              throw new Error('before request')
            }
          ]
        }
      }
    ],
    [
      '`json` is used with `body`',
      LYLA_ERROR.BAD_REQUEST,
      { url: '/', method: 'post', json: {}, body: '' }
    ],
    [
      'GET request has body',
      LYLA_ERROR.BAD_REQUEST,
      { url: '/', method: 'get', body: 'body' }
    ],
    [
      'GET request has json',
      LYLA_ERROR.BAD_REQUEST,
      { url: '/', method: 'GET', json: { a: 1 } }
    ],
    [
      '`onBeforeRequest` adds body to GET request',
      LYLA_ERROR.BAD_REQUEST,
      {
        url: '/',
        hooks: {
          onBeforeRequest: [(options) => ({ ...options, body: 'body' })]
        }
      }
    ],
    [
      '`context` is used with `createContext`',
      LYLA_ERROR.BAD_REQUEST,
      { url: '/', context: null, createContext: () => undefined }
    ]
  ]

  it.each(cases)(
    'calls `onNonResponseError` and rejects when %s',
    async (_, type, options) => {
      const hookErrors: LylaError[] = []
      const { lyla, requests } = createTestLyla((error) => {
        hookErrors.push(error)
      })
      const error = await catchError(lyla(options))
      expect(isLylaError(error)).toBe(true)
      expect((error as LylaError).type).toBe(type)
      expect(hookErrors).toEqual([error])
      expect(requests).toHaveLength(0)
    }
  )

  it('keeps the thrown error of `onInit` and `onBeforeRequest`', async () => {
    const initError = new Error('init')
    const beforeRequestError = new Error('before request')
    const { lyla } = createTestLyla(() => {})
    const error1 = (await catchError(
      lyla.get('/', {
        hooks: {
          onInit: [
            () => {
              throw initError
            }
          ]
        }
      })
    )) as LylaError
    const error2 = (await catchError(
      lyla.get('/', {
        hooks: {
          onBeforeRequest: [
            () => {
              throw beforeRequestError
            }
          ]
        }
      })
    )) as LylaError
    expect(error1.error).toBe(initError)
    expect(error2.error).toBe(beforeRequestError)
  })

  it('rejects with `BROKEN_ON_NON_RESPONSE_ERROR` when `onNonResponseError` throws', async () => {
    const hookError = new Error('hook')
    const { lyla, requests } = createTestLyla(() => {
      throw hookError
    })
    const error = await catchError(
      lyla({
        url: '/?foo=bar',
        query: { foo: 'bar' }
      })
    )
    expect(isLylaError(error)).toBe(true)
    expect((error as LylaError).type).toBe(
      LYLA_ERROR.BROKEN_ON_NON_RESPONSE_ERROR
    )
    expect((error as LylaError).error).toBe(hookError)
    expect(requests).toHaveLength(0)
  })

  it("doesn't produce unhandled rejections", async () => {
    const unhandled: unknown[] = []
    const onUnhandledRejection = (reason: unknown) => unhandled.push(reason)
    process.on('unhandledRejection', onUnhandledRejection)
    try {
      const { lyla } = createTestLyla(() => {})
      for (const [, , options] of cases) {
        await catchError(lyla(options))
      }
      await sleep(10)
    } finally {
      process.off('unhandledRejection', onUnhandledRejection)
    }
    expect(unhandled).toEqual([])
  })
})

describe('core error utilities', () => {
  it('spreads error into a plain object', async () => {
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => respond(request, { status: 500 }))
    })
    const { lyla } = createLyla(adapter, { createContext: () => 'context' })
    const error = (await catchError(lyla.get('/'))) as LylaError
    const spread = error.spread()
    expect(spread).not.toBeInstanceOf(Error)
    expect(spread).toMatchObject({
      name: 'LylaError[HTTP]',
      message: 'Request failed with 500 Internal Server Error',
      type: LYLA_ERROR.HTTP,
      context: 'context',
      error: undefined,
      detail: undefined
    })
    expect(spread.response).toBe(error.response)
    expect(spread.requestOptions).toBe(error.requestOptions)
    expect(isLylaError(spread)).toBe(true)
  })

  it('distinguishes lyla errors from other values', () => {
    const { isLylaError: isInstanceLylaError } = createLyla(
      createFakeAdapter().adapter,
      { createContext: () => undefined }
    )
    for (const value of [new Error(), null, undefined, 'error', {}]) {
      expect(isLylaError(value)).toBe(false)
      expect(isLylaErrorWithRetry(value)).toBe(false)
      expect(isInstanceLylaError(value)).toBe(false)
    }
  })
})
