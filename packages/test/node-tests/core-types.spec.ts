// @vitest-environment node
import { createLyla, LylaAbortController, LYLA_ERROR } from '@lylajs/core'
import type {
  Lyla,
  LylaAdapterMeta,
  LylaContextFactory,
  LylaCreateOptions,
  LylaError,
  LylaErrorWithRetry,
  LylaNonResponseError,
  LylaNormalizedRequestOptions,
  LylaRequestOptions,
  LylaRequestOptionsWithContext,
  LylaResponse,
  LylaResponseError
} from '@lylajs/core'
import type * as LylaWeb from '@lylajs/web'
import type * as LylaNode from '@lylajs/node'
import type * as LylaUniversal from 'lyla'
import { describe, expectTypeOf, it } from 'vitest'
import { createFakeAdapter } from './utils'

/**
 * The callback is only type checked and never called.
 */
function typeOnly(_: () => unknown) {}

type Context = { userId: string }
type M = LylaAdapterMeta

const { adapter } = createFakeAdapter()

function createTestLyla() {
  return createLyla(adapter, {
    createContext: (): Context => ({ userId: '' })
  })
}

describe('createLyla types', () => {
  it('infers context type from `createContext`', () => {
    const { lyla, isLylaError, isLylaErrorWithRetry } = createTestLyla()
    expectTypeOf(lyla).toEqualTypeOf<Lyla<Context, M>>()
    expectTypeOf(lyla.errorType).toEqualTypeOf<LylaError<Context, M>>()
    expectTypeOf(isLylaError).guards.toEqualTypeOf<LylaError<Context, M>>()
    expectTypeOf(isLylaErrorWithRetry).guards.toEqualTypeOf<
      LylaErrorWithRetry<Context, M>
    >()
  })

  it('accepts explicit context type', () => {
    const { lyla } = createLyla<string | null, M>(adapter, {
      createContext: () => null
    })
    expectTypeOf(lyla).toEqualTypeOf<Lyla<string | null, M>>()
    typeOnly(() =>
      createLyla<string, M>(adapter, {
        // @ts-expect-error `createContext` must return the context type
        createContext: () => 1
      })
    )
  })

  it('requires `createContext` and rejects `context`', () => {
    typeOnly(() =>
      // @ts-expect-error `createContext` is required
      createLyla(adapter, {})
    )
    typeOnly(() =>
      // @ts-expect-error `createContext` is required
      createLyla(adapter, { baseUrl: '/' }, { createContext: () => 1 })
    )
    typeOnly(() =>
      createLyla(adapter, {
        createContext: () => 1,
        // @ts-expect-error `context` isn't allowed in `createLyla`
        context: 1
      })
    )
    typeOnly(() =>
      createLyla(
        adapter,
        { createContext: () => 1 },
        {
          // @ts-expect-error `context` isn't allowed in overrides
          context: 1
        }
      )
    )
  })

  it('types `parent` of context factories', () => {
    createLyla(
      adapter,
      { createContext: (): Context => ({ userId: '' }) },
      {},
      {
        createContext: (parent) => {
          expectTypeOf(parent).toEqualTypeOf<{ context: Context } | null>()
          return parent!.context
        }
      }
    )
    typeOnly(() =>
      createLyla(
        adapter,
        { createContext: (): Context => ({ userId: '' }) },
        {
          // @ts-expect-error override factory must return the context type
          createContext: () => 1
        }
      )
    )
    expectTypeOf<LylaContextFactory<Context>>().toEqualTypeOf<
      (parent: { context: Context } | null) => Context
    >()
  })

  it('omits `context` from create options', () => {
    expectTypeOf<LylaCreateOptions<Context>>().not.toHaveProperty('context')
    expectTypeOf<LylaCreateOptions<Context>>()
      .toHaveProperty('createContext')
      .toEqualTypeOf<LylaContextFactory<Context> | undefined>()
  })
})

describe('request types', () => {
  it('types `context` and `createContext` of request options', () => {
    const { lyla } = createTestLyla()
    typeOnly(() => lyla.get('/', { context: { userId: '1' } }))
    typeOnly(() =>
      lyla.get('/', {
        // @ts-expect-error request context must be the context type
        context: { userId: 1 }
      })
    )
    typeOnly(() =>
      lyla.get('/', {
        createContext: (parent) => {
          expectTypeOf(parent).toEqualTypeOf<{ context: Context } | null>()
          return { userId: '' }
        }
      })
    )
    typeOnly(() =>
      lyla.get('/', {
        // @ts-expect-error request factory must return the context type
        createContext: () => 1
      })
    )
    expectTypeOf<LylaRequestOptions<Context>>()
      .toHaveProperty('context')
      .toEqualTypeOf<Context | undefined>()
    expectTypeOf<LylaRequestOptionsWithContext<Context>>()
      .toHaveProperty('context')
      .toEqualTypeOf<Context>()
  })

  it('types normalized request options', () => {
    type Normalized = LylaNormalizedRequestOptions<Context>
    expectTypeOf<Normalized>().toHaveProperty('url').toEqualTypeOf<string>()
    expectTypeOf<Normalized>()
      .toHaveProperty('responseType')
      .toEqualTypeOf<'arraybuffer' | 'blob' | 'text'>()
    expectTypeOf<Normalized>()
      .toHaveProperty('method')
      .toEqualTypeOf<
        | 'GET'
        | 'POST'
        | 'PUT'
        | 'PATCH'
        | 'HEAD'
        | 'DELETE'
        | 'OPTIONS'
        | 'TRACE'
        | 'CONNECT'
      >()
    expectTypeOf<Normalized>().toExtend<
      LylaRequestOptionsWithContext<Context>
    >()
    expectTypeOf<
      LylaRequestOptionsWithContext<Context>
    >().not.toExtend<Normalized>()
  })

  it('types response', () => {
    const { lyla } = createTestLyla()
    typeOnly(async () => {
      const response = await lyla.get<{ id: number }>('/')
      expectTypeOf(response).toEqualTypeOf<
        LylaResponse<{ id: number }, Context, M>
      >()
      expectTypeOf(response.json).toEqualTypeOf<{ id: number }>()
      expectTypeOf(response.context).toEqualTypeOf<Context>()
      expectTypeOf(response.requestOptions).toEqualTypeOf<
        LylaNormalizedRequestOptions<Context, M>
      >()
      const anyResponse = await lyla({ url: '/' })
      expectTypeOf(anyResponse.json).toBeAny()
    })
  })

  it('only accepts signal with `aborted`', () => {
    const { lyla } = createTestLyla()
    typeOnly(() => lyla.get('/', { signal: new AbortController().signal }))
    typeOnly(() => lyla.get('/', { signal: new LylaAbortController().signal }))
    typeOnly(() =>
      lyla.get('/', {
        // @ts-expect-error `aborted` is required
        signal: { addEventListener() {}, removeEventListener() {} }
      })
    )
  })

  it('only accepts known methods', () => {
    const { lyla } = createTestLyla()
    typeOnly(() => lyla({ method: 'PATCH' }))
    typeOnly(() =>
      // @ts-expect-error unknown method
      lyla({ method: 'FETCH' })
    )
    typeOnly(() =>
      // @ts-expect-error shortcut options don't accept `method`
      lyla.get('/', { method: 'POST' })
    )
  })

  it('types hooks and progress callbacks', () => {
    createLyla(adapter, {
      createContext: (): Context => ({ userId: '' }),
      hooks: {
        onInit: [
          (options) => {
            expectTypeOf(options).toEqualTypeOf<
              LylaRequestOptionsWithContext<Context, M>
            >()
            return options
          }
        ],
        onBeforeRequest: [
          async (options) => {
            expectTypeOf(options).toEqualTypeOf<
              LylaNormalizedRequestOptions<Context, M>
            >()
            expectTypeOf(options.context).toEqualTypeOf<Context>()
            return options
          },
          // may return options which aren't normalized
          ({ context }) => ({ context })
        ],
        onHeadersReceived: [
          ({ headers, requestOptions }, reject) => {
            expectTypeOf(headers).toEqualTypeOf<Record<string, string>>()
            expectTypeOf(requestOptions).toEqualTypeOf<
              LylaNormalizedRequestOptions<Context, M>
            >()
            expectTypeOf(reject).toEqualTypeOf<(reason: unknown) => void>()
          }
        ],
        onAfterResponse: [
          (response) => {
            expectTypeOf(response).toEqualTypeOf<
              LylaResponse<any, Context, M>
            >()
            return response
          }
        ],
        onResponseError: [
          (error) => {
            expectTypeOf(error).toEqualTypeOf<LylaResponseError<Context, M>>()
            expectTypeOf(error.context).toEqualTypeOf<Context>()
          }
        ],
        onNonResponseError: [
          (error) => {
            expectTypeOf(error).toEqualTypeOf<
              LylaNonResponseError<Context, M>
            >()
          }
        ]
      },
      onDownloadProgress: (progress) => {
        expectTypeOf(progress.requestOptions).toEqualTypeOf<
          LylaNormalizedRequestOptions<Context, M>
        >()
      }
    })
    typeOnly(() =>
      createLyla(adapter, {
        createContext: () => 1,
        hooks: {
          // @ts-expect-error `onInit` must return options
          onInit: [() => undefined]
        }
      })
    )
  })
})

describe('error types', () => {
  it('narrows error by type', () => {
    const { lyla, isLylaError, isLylaErrorWithRetry } = createTestLyla()
    typeOnly(async () => {
      try {
        await lyla.get('/')
      } catch (e) {
        expectTypeOf(e).toBeUnknown()
        if (isLylaError(e)) {
          // `BAD_REQUEST` raised by `createContext` has no context
          expectTypeOf(e.context).toEqualTypeOf<Context | undefined>()
          expectTypeOf(e.requestOptions).toExtend<
            LylaRequestOptions<Context, M>
          >()
          switch (e.type) {
            case LYLA_ERROR.HTTP:
              expectTypeOf(e.context).toEqualTypeOf<Context>()
              expectTypeOf(e.response).toEqualTypeOf<
                LylaResponse<any, Context, M>
              >()
              expectTypeOf(e.error).toBeUndefined()
              expectTypeOf(e.requestOptions).toEqualTypeOf<
                LylaNormalizedRequestOptions<Context, M>
              >()
              break
            case LYLA_ERROR.TIMEOUT:
            case LYLA_ERROR.ABORTED:
              expectTypeOf(e.response).toBeUndefined()
              expectTypeOf(e.error).toBeUndefined()
              expectTypeOf(e.requestOptions).toEqualTypeOf<
                LylaNormalizedRequestOptions<Context, M>
              >()
              break
            // may be raised before options are normalized
            case LYLA_ERROR.BAD_REQUEST:
            case LYLA_ERROR.BROKEN_ON_NON_RESPONSE_ERROR:
              expectTypeOf(e.context).toEqualTypeOf<Context | undefined>()
              expectTypeOf(e.requestOptions).toEqualTypeOf<
                LylaRequestOptions<Context, M>
              >()
              expectTypeOf(e.error).toBeUnknown()
              break
            case LYLA_ERROR.NETWORK:
              expectTypeOf(e.detail).toBeAny()
              break
            case LYLA_ERROR.INVALID_JSON:
              expectTypeOf(e.error).toEqualTypeOf<SyntaxError>()
              expectTypeOf(e.response).toEqualTypeOf<
                LylaResponse<any, Context, M>
              >()
              break
            case LYLA_ERROR.BROKEN_ON_INIT:
              expectTypeOf(e.context).toEqualTypeOf<Context>()
              expectTypeOf(e.error).toBeUnknown()
              expectTypeOf(e.requestOptions).toEqualTypeOf<
                LylaRequestOptionsWithContext<Context, M>
              >()
              break
            case LYLA_ERROR.BROKEN_ON_BEFORE_REQUEST:
              expectTypeOf(e.error).toBeUnknown()
              expectTypeOf(e.requestOptions).toEqualTypeOf<
                LylaNormalizedRequestOptions<Context, M>
              >()
              break
            case LYLA_ERROR.BROKEN_ON_AFTER_RESPONSE:
              expectTypeOf(e.response).toEqualTypeOf<
                LylaResponse<any, Context, M>
              >()
              break
          }
          // @ts-expect-error `BROKEN_RETRY` isn't a type of `LylaError`
          if (e.type === LYLA_ERROR.BROKEN_RETRY) {
          }
        }
        if (isLylaErrorWithRetry(e) && e.type === LYLA_ERROR.BROKEN_RETRY) {
          expectTypeOf(e.isRetryError).toEqualTypeOf<true>()
          expectTypeOf(e.context).toEqualTypeOf<Context | undefined>()
          expectTypeOf(e.requestOptions).toEqualTypeOf<
            LylaRequestOptions<Context, M>
          >()
        }
      }
    })
  })
})

describe('retry types', () => {
  it('types params of retry callbacks', () => {
    const { lyla } = createTestLyla()
    const lylaWithRetry = lyla.withRetry({
      createState: () => ({ count: 0 }),
      onResolved: async (params) => {
        expectTypeOf(params.state).toEqualTypeOf<{ count: number }>()
        expectTypeOf(params.context).toEqualTypeOf<Context>()
        expectTypeOf(params.options).toEqualTypeOf<
          LylaRequestOptions<Context, M>
        >()
        expectTypeOf(params.response).toEqualTypeOf<
          LylaResponse<any, Context, M>
        >()
        return { action: 'resolve', value: params.response }
      },
      onRejected: async (params) => {
        expectTypeOf(params.state).toEqualTypeOf<{ count: number }>()
        expectTypeOf(params.context).toEqualTypeOf<Context | undefined>()
        expectTypeOf(params.error).toBeUnknown()
        expectTypeOf(params.lyla).toEqualTypeOf<Lyla<Context, M>>()
        return { action: 'retry', value: async () => params.options }
      },
      onBrokenRetry: async (params) => {
        expectTypeOf(params.state).toEqualTypeOf<
          { count: number } | undefined
        >()
        expectTypeOf(params.context).toEqualTypeOf<Context | undefined>()
        expectTypeOf(params.options).toEqualTypeOf<
          LylaRequestOptions<Context, M> | undefined
        >()
        expectTypeOf(params.error.type).toEqualTypeOf<LYLA_ERROR.BROKEN_RETRY>()
        expectTypeOf(params.error.error).toBeUnknown()
        return { action: 'reject', value: params.error }
      }
    })
    expectTypeOf(lylaWithRetry).toEqualTypeOf<Lyla<Context, M>>()
  })

  it('rejects invalid retry options', () => {
    const { lyla } = createTestLyla()
    const onResolved = async ({
      response
    }: {
      response: LylaResponse<any, Context>
    }) => ({ action: 'resolve' as const, value: response })
    const onRejected = async ({ error }: { error: unknown }) => ({
      action: 'reject' as const,
      value: error
    })
    typeOnly(() =>
      // @ts-expect-error `onBrokenRetry` is required
      lyla.withRetry({
        createState: () => undefined,
        onResolved,
        onRejected
      })
    )
    typeOnly(() =>
      lyla.withRetry({
        createState: () => undefined,
        onResolved,
        // @ts-expect-error `onRejected` can't resolve
        onRejected: async ({ options }) => ({ action: 'resolve', value: options }),
        onBrokenRetry: onRejected
      })
    )
    typeOnly(() =>
      lyla.withRetry({
        createState: () => undefined,
        onResolved,
        onRejected,
        // @ts-expect-error retry options must be request options
        onBrokenRetry: async () => ({
          action: 'retry',
          value: () => ({ context: 1 })
        })
      })
    )
  })
})

declare const web: typeof LylaWeb
declare const node: typeof LylaNode
declare const universal: typeof LylaUniversal

describe('platform types', () => {
  it('defaults context of platform instances to undefined', () => {
    expectTypeOf<
      Awaited<ReturnType<typeof LylaWeb.lyla.get>>['context']
    >().toBeUndefined()
    expectTypeOf<
      Awaited<ReturnType<typeof LylaNode.lyla.get>>['context']
    >().toBeUndefined()
    expectTypeOf<
      Awaited<ReturnType<typeof LylaUniversal.lyla.get>>['context']
    >().toBeUndefined()
  })

  it('types `createLyla` of platform packages', () => {
    typeOnly(async () => {
      const createContext = (): Context => ({ userId: '' })
      const responses = [
        await web.createLyla({ createContext }).lyla.get('/'),
        await node.createLyla({ createContext }).lyla.get('/'),
        await universal.createLyla({ createContext }).lyla.get('/')
      ]
      for (const response of responses) {
        expectTypeOf(response.context).toEqualTypeOf<Context>()
      }
    })
    typeOnly(() => {
      // @ts-expect-error `createContext` is required
      web.createLyla({})
      // @ts-expect-error `createContext` is required
      node.createLyla({})
      // @ts-expect-error `createContext` is required
      universal.createLyla({})
    })
    typeOnly(() => {
      web.createLyla({
        createContext: () => 1,
        // @ts-expect-error `context` isn't allowed in `createLyla`
        context: 1
      })
      node.createLyla(
        { createContext: () => 1 },
        // @ts-expect-error `context` isn't allowed in overrides
        { context: 1 }
      )
    })
  })

  it('exports create option types from platform packages', () => {
    expectTypeOf<LylaWeb.LylaCreateOptions<Context>>().not.toHaveProperty(
      'context'
    )
    expectTypeOf<LylaNode.LylaCreateOptions<Context>>().not.toHaveProperty(
      'context'
    )
    expectTypeOf<
      LylaUniversal.LylaCreateOptions<Context>
    >().not.toHaveProperty('context')
    expectTypeOf<LylaWeb.LylaContextFactory<Context>>().toEqualTypeOf<
      LylaContextFactory<Context>
    >()
    expectTypeOf<LylaWeb.LylaRequestOptionsWithContext<Context>>()
      .toHaveProperty('context')
      .toEqualTypeOf<Context>()
    expectTypeOf<LylaWeb.LylaNormalizedRequestOptions<Context>>()
      .toHaveProperty('method')
      .toEqualTypeOf<
        | 'GET'
        | 'POST'
        | 'PUT'
        | 'PATCH'
        | 'HEAD'
        | 'DELETE'
        | 'OPTIONS'
        | 'CONNECT'
        | 'TRACE'
      >()
    expectTypeOf<LylaNode.LylaNormalizedRequestOptions<Context>>()
      .toHaveProperty('url')
      .toEqualTypeOf<string>()
    expectTypeOf<
      Awaited<ReturnType<typeof LylaUniversal.lyla.get>>['requestOptions']
    >().toEqualTypeOf<LylaUniversal.LylaNormalizedRequestOptions>()
    expectTypeOf<LylaWeb.LylaRequestOptions<Context>>()
      .toHaveProperty('createContext')
      .toEqualTypeOf<LylaContextFactory<Context> | undefined>()
  })
})
