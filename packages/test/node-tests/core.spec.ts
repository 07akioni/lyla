// @vitest-environment node
import { createLyla, isLylaError, LYLA_ERROR } from '@lylajs/core'
import type { LylaError, LylaRequestOptions } from '@lylajs/core'
import { describe, expect, it } from 'vitest'

describe('core retry', () => {
  it('throws non-lyla errors returned by onResolved reject action directly', async () => {
    const originalError = new Error('resolved reject')
    const { lyla } = createLyla(
      ({ onResponse }) => {
        setTimeout(() => {
          onResponse(
            {
              body: '',
              headers: {},
              status: 200
            },
            undefined
          )
        })
        return {
          abort() {}
        }
      },
      {
        createContext: () => undefined
      }
    )
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: async () => ({
        action: 'reject',
        value: originalError
      }),
      onRejected: async () => ({
        action: 'reject',
        value: new Error('unexpected')
      })
    })

    await expect(lylaWithRetry.get('/')).rejects.toBe(originalError)
  })

  it('throws non-lyla errors returned by onRejected reject action directly', async () => {
    const originalError = new Error('rejected reject')
    const { lyla } = createLyla(
      ({ onNetworkError }) => {
        setTimeout(() => {
          onNetworkError(new Error('network'))
        })
        return {
          abort() {}
        }
      },
      {
        createContext: () => undefined
      }
    )
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: async () => ({
        action: 'resolve',
        value: undefined as any
      }),
      onRejected: async () => ({
        action: 'reject',
        value: originalError
      })
    })

    await expect(lylaWithRetry.get('/')).rejects.toBe(originalError)
  })
})

describe('core context', () => {
  it('resolves context from request options and context factories', async () => {
    const parents: Array<{ context: string[] } | null> = []
    const { lyla } = createLyla(
      ({ onResponse }) => {
        setTimeout(() => {
          onResponse({ body: '', headers: {}, status: 200 }, undefined)
        })
        return {
          abort() {}
        }
      },
      {
        createContext: (parent: { context: string[] } | null) => {
          parents.push(parent)
          return ['base']
        }
      },
      {},
      {
        createContext: (parent) => [...parent!.context, 'override']
      }
    )

    const { context: createdContext1 } = await lyla.get('/')
    const { context: createdContext2 } = await lyla.get('/')
    expect(createdContext1).toEqual(['base', 'override'])
    expect(createdContext2).toEqual(['base', 'override'])
    expect(createdContext1).not.toBe(createdContext2)
    expect(parents).toEqual([null, null])

    const requestContext = ['request']
    const { context } = await lyla.get('/', { context: requestContext })
    expect(context).toBe(requestContext)
    expect(parents).toEqual([null, null])

    const { context: chainedContext } = await lyla.get('/', {
      createContext: (parent) => [...parent!.context, 'request']
    })
    expect(chainedContext).toEqual(['base', 'override', 'request'])
    expect(parents).toEqual([null, null, null])

    try {
      await lyla.get('/', {
        context: ['request'],
        createContext: () => ['request']
      })
      throw new Error('Expected request to be rejected')
    } catch (error) {
      expect(isLylaError(error)).toBe(true)
      if (isLylaError(error)) {
        expect(error.type).toBe(LYLA_ERROR.BAD_REQUEST)
      }
    }
    expect(parents).toEqual([null, null, null])
  })
})

describe('core timeout', () => {
  it('keeps timeout error when abort triggers adapter callbacks', async () => {
    const { lyla } = createLyla(
      ({ onNetworkError, onResponse }) => {
        return {
          abort() {
            onNetworkError(new Error('aborted'))
            onResponse(
              {
                body: '',
                headers: {},
                status: 0
              },
              undefined
            )
          }
        }
      },
      {
        createContext: () => undefined
      }
    )

    try {
      await lyla.get('/', {
        timeout: 1
      })
      throw new Error('Expected request to timeout')
    } catch (error) {
      expect(isLylaError(error)).toBe(true)
      if (isLylaError(error)) {
        expect(error.type).toBe(LYLA_ERROR.TIMEOUT)
      }
    }
  })
})

describe('core errors before request is sent', () => {
  function createTestLyla(onNonResponseError: (error: LylaError) => void) {
    let adapterCalls = 0
    const { lyla } = createLyla(
      () => {
        adapterCalls++
        return {
          abort() {}
        }
      },
      {
        createContext: () => undefined,
        hooks: {
          onNonResponseError: [onNonResponseError]
        }
      }
    )
    return { lyla, getAdapterCalls: () => adapterCalls }
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
      '`context` is used with `createContext`',
      LYLA_ERROR.BAD_REQUEST,
      { url: '/', context: null, createContext: () => undefined }
    ]
  ]

  it.each(cases)(
    'calls `onNonResponseError` and rejects when %s',
    async (_, type, options) => {
      const hookErrors: LylaError[] = []
      const { lyla, getAdapterCalls } = createTestLyla((error) => {
        hookErrors.push(error)
      })
      const error = await lyla(options).catch((e: unknown) => e)
      expect(isLylaError(error)).toBe(true)
      expect((error as LylaError).type).toBe(type)
      expect(hookErrors).toEqual([error])
      expect(getAdapterCalls()).toBe(0)
    }
  )

  it('rejects with `BROKEN_ON_NON_RESPONSE_ERROR` when `onNonResponseError` throws', async () => {
    const hookError = new Error('hook')
    const { lyla, getAdapterCalls } = createTestLyla(() => {
      throw hookError
    })
    const error = await lyla({
      url: '/?foo=bar',
      query: { foo: 'bar' }
    }).catch((e: unknown) => e)
    expect(isLylaError(error)).toBe(true)
    expect((error as LylaError).type).toBe(
      LYLA_ERROR.BROKEN_ON_NON_RESPONSE_ERROR
    )
    expect((error as LylaError).error).toBe(hookError)
    expect(getAdapterCalls()).toBe(0)
  })
})
