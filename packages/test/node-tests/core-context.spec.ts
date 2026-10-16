// @vitest-environment node
import { createLyla, isLylaError, LYLA_ERROR } from '@lylajs/core'
import type { LylaError } from '@lylajs/core'
import { describe, expect, it, vi } from 'vitest'
import { catchError, createFakeAdapter, respond } from './utils'

type Context = { tags: string[] }

describe('core context', () => {
  it('resolves context from request options and context factories', async () => {
    const parents: Array<{ context: string[] } | null> = []
    const { lyla } = createLyla(
      createFakeAdapter().adapter,
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

    const error = await catchError(
      lyla.get('/', {
        context: ['request'],
        createContext: () => ['request']
      })
    )
    expect(isLylaError(error)).toBe(true)
    expect((error as LylaError).type).toBe(LYLA_ERROR.BAD_REQUEST)
    expect((error as LylaError).context).toEqual(['request'])
    expect(parents).toEqual([null, null, null])
  })

  it('passes the parent object created by the previous factory', async () => {
    const created: Context[] = []
    const received: Array<{ context: Context } | null> = []
    const factory = (parent: { context: Context } | null): Context => {
      received.push(parent)
      const context = { tags: [...(parent?.context.tags ?? []), 'tag'] }
      created.push(context)
      return context
    }
    const { lyla } = createLyla(
      createFakeAdapter().adapter,
      { createContext: factory },
      { createContext: factory }
    )
    const { context } = await lyla.get('/', { createContext: factory })
    expect(received).toEqual([
      null,
      { context: created[0] },
      { context: created[1] }
    ])
    expect(received[1]!.context).toBe(created[0])
    expect(received[2]!.context).toBe(created[1])
    expect(context).toBe(created[2])
    expect(context.tags).toEqual(['tag', 'tag', 'tag'])
  })

  it('allows factories to ignore the parent context', async () => {
    const { lyla } = createLyla(
      createFakeAdapter().adapter,
      { createContext: () => 'base' },
      { createContext: () => 'override' }
    )
    expect((await lyla.get('/')).context).toBe('override')
    expect(
      (await lyla.get('/', { createContext: () => 'request' })).context
    ).toBe('request')
  })

  it('uses factories when request context is undefined', async () => {
    const createContext = vi.fn(() => 'created')
    const { lyla } = createLyla(createFakeAdapter().adapter, { createContext })
    const { context } = await lyla.get('/', { context: undefined })
    expect(context).toBe('created')
    expect(createContext).toHaveBeenCalledTimes(1)
  })

  it('uses falsy request context as is', async () => {
    const createContext = vi.fn((): string | null | number => 'created')
    const { lyla } = createLyla(createFakeAdapter().adapter, { createContext })
    expect((await lyla.get('/', { context: null })).context).toBe(null)
    expect((await lyla.get('/', { context: 0 })).context).toBe(0)
    expect((await lyla.get('/', { context: '' })).context).toBe('')
    expect(createContext).not.toHaveBeenCalled()
  })

  it("doesn't clone request context", async () => {
    const { lyla } = createLyla(createFakeAdapter().adapter, {
      createContext: (): Context => ({ tags: [] }),
      hooks: {
        onBeforeRequest: [
          (options) => {
            options.context.tags.push('before request')
            return options
          }
        ]
      }
    })
    const context: Context = { tags: [] }
    const response = await lyla.get('/', { context })
    expect(response.context).toBe(context)
    expect(context.tags).toEqual(['before request'])
  })

  it('shares the same context object across hooks, progress and response', async () => {
    const seen: unknown[] = []
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => {
        request.onHeadersReceived?.({}, undefined)
        request.onDownloadProgress?.({
          percent: 100,
          loaded: 1,
          total: 1,
          lengthComputable: true,
          detail: undefined,
          originalRequest: undefined
        })
        respond(request)
      })
    })
    const { lyla } = createLyla(adapter, {
      createContext: (): Context => ({ tags: [] }),
      hooks: {
        onInit: [
          (options) => {
            seen.push(options.context)
            return options
          }
        ],
        onBeforeRequest: [
          (options) => {
            seen.push(options.context)
            return options
          }
        ],
        onHeadersReceived: [
          ({ requestOptions }) => {
            seen.push(requestOptions.context)
          }
        ],
        onAfterResponse: [
          (response) => {
            seen.push(response.context, response.requestOptions.context)
            return response
          }
        ]
      }
    })
    const response = await lyla.get('/', {
      onDownloadProgress: ({ requestOptions }) => {
        seen.push(requestOptions.context)
      }
    })
    expect(seen).toHaveLength(6)
    for (const context of seen) {
      expect(context).toBe(response.context)
    }
  })

  it('passes context to errors', async () => {
    const context: Context = { tags: [] }
    const { adapter } = createFakeAdapter((request) => {
      setTimeout(() => respond(request, { status: 500 }))
    })
    const { lyla } = createLyla(adapter, {
      createContext: (): Context => ({ tags: [] }),
      hooks: {
        onResponseError: [
          (error) => {
            error.context.tags.push('response error')
          }
        ]
      }
    })
    const error = (await catchError(lyla.get('/', { context }))) as LylaError
    expect(error.context).toBe(context)
    expect(error.response?.context).toBe(context)
    expect(context.tags).toEqual(['response error'])
  })

  it('uses context replaced by `onInit`', async () => {
    const replaced: Context = { tags: ['replaced'] }
    const { lyla } = createLyla(createFakeAdapter().adapter, {
      createContext: (): Context => ({ tags: [] }),
      hooks: {
        onInit: [(options) => ({ ...options, context: replaced })]
      }
    })
    const response = await lyla.get('/')
    expect(response.context).toBe(replaced)
    expect(response.requestOptions.context).toBe(replaced)
  })

  it('rejects with `BAD_REQUEST` error without sending request when a context factory throws', async () => {
    const factoryError = new Error('factory')
    const { adapter, requests } = createFakeAdapter()
    const onNonResponseError = vi.fn()
    const { lyla } = createLyla(adapter, {
      createContext: () => undefined,
      hooks: { onNonResponseError: [onNonResponseError] }
    })
    const error = await catchError(
      lyla.get('/', {
        createContext: () => {
          throw factoryError
        }
      })
    )
    if (!isLylaError(error) || error.type !== LYLA_ERROR.BAD_REQUEST) {
      throw new Error('Expected a BAD_REQUEST error')
    }
    expect(error.error).toBe(factoryError)
    expect(error.context).toBeUndefined()
    expect(error.requestOptions.context).toBeUndefined()
    expect(onNonResponseError).toHaveBeenCalledExactlyOnceWith(error)
    expect(requests).toHaveLength(0)
  })
})
