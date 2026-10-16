# lyla · [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) [![ci](https://github.com/07akioni/lyla/actions/workflows/node.js.yml/badge.svg)](https://github.com/07akioni/lyla/actions/workflows/node.js.yml/badge.svg) [![npm version](https://badge.fury.io/js/lyla.svg)](https://badge.fury.io/js/lyla) [![minzipped size](https://badgen.net/bundlephobia/minzip/lyla)](https://badgen.net/bundlephobia/minzip/lyla)

A fully typed HTTP client with explicit behavior & error handling.

> [!IMPORTANT]  
> If you only want to support browser environment, you should use package `@lylajs/web` instead of `lyla`.

| Environment          | Package           | Note                                                                                            |
| -------------------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| web                  | `@lylajs/web`     |                                                                                                 |
| node                 | `@lylajs/node`    |                                                                                                 |
| toutiao miniprogram  | `@lylajs/tt`      |                                                                                                 |
| weixin miniprogram   | `@lylajs/wx`      |                                                                                                 |
| qq miniprogram       | `@lylajs/qq`      |                                                                                                 |
| zhifubao miniprogram | `@lylajs/my`      |                                                                                                 |
| uni-app              | `@lylajs/uni-app` |                                                                                                 |
| web + nodejs         | `lyla`            | Unless you have explicit cross-platform isomorphic requirements, please don't use this package. |

English · [中文](https://github.com/07akioni/lyla/blob/main/README.zh_CN.md)

- Won't share options between different instances, which means your reqeust won't be unexpectedly modified.
- Won't transform response body implicitly (For example transform invalid JSON to string).
- Won't suppress expection silently (JSON parse error, config error, eg.).
- [Explicit error handling](#error-handling).
- Supports typescript for response data.
- Supports upload progress (which isn't supported by fetch API).
- Friendly error tracing (with sync trace, you can see where the request is sent on error).
- Access typed custom context object in the whole process.

For difference compared with other libs, see [FAQ](#faq).

## Installation

```bash
# you can install `lyla` or `@lylajs/xxx`
npm i @lylajs/web # for npm
pnpm i @lylajs/web # for pnpm
yarn add @lylajs/web # for yarn
```

## Usage

> [!IMPORTANT]  
> Lyla use **`json`** field to config request data, not `body`! Also, there's **no** `data` field in lyla.
>
> `body` field is used to set raw body of the request such as `string` or `Blob`, which is not a common case.

```ts
import { createLyla } from '@lylajs/web'

// For request which need default options, hooks or custom context info,
// it's recommended using `createLyla` to create lyla instance.
// If you only need the simplest usage, you can use
// import { lyla } from '@lylajs/web'
const { lyla } = createLyla({ createContext: () => null })
const { json } = await lyla.post('https://example.com', {
  json: { foo: 'bar' }
})

// TypeScript
type MyType = {}

// `json`'s type is `MyType`
const { json } = await lyla.post<MyType>('https://example.com', {
  json: { foo: 'bar' }
})
```

## API

### `createLyla(options, ...overrides)`

```ts
function createLyla<C>(
  options: LylaCreateOptions<C> & { createContext: LylaContextFactory<C> },
  ...overrides: LylaCreateOptions<C>[]
): { lyla: Lyla; isLylaError: (e: unknown) => e is LylaError }

// Same as `LylaRequestOptions`, except that `context` isn't allowed
type LylaCreateOptions<C> = Omit<LylaRequestOptions<C>, 'context'>

type LylaContextFactory<C> = (parent: { context: C } | null) => C
```

For how the context of a request is created, see [Context](#context).

### `lyla<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.get<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.post<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.put<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.patch<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.head<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.delete<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.connect<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.options<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.trace<T>(options: LylaRequestOptions): LylaResponse<T>`

### `lyla.withRetry(options: LylaWithRetryOptions) => Lyla`

Beta compatibility. Currently only work in `2.0.0-beta.1` and later versions.

Create a `lyla` instance with retry feature using existing `lyla` instance. For detail see [Retry request](#Retry request).

#### Type `LylaRequestOptions`

```ts
type LylaRequestOptions<C = undefined> = {
  url?: string
  method?:
    | 'get'
    | 'GET'
    | 'post'
    | 'POST'
    | 'put'
    | 'PUT'
    | 'patch'
    | 'PATCH'
    | 'head'
    | 'HEAD'
    | 'delete'
    | 'DELETE'
    | 'options'
    | 'OPTIONS'
  timeout?: number
  /**
   * True when credentials are to be included in a cross-origin request.
   * False when they are to be excluded in a cross-origin request and when
   * cookies are to be ignored in its response.
   */
  withCredentials?: boolean
  headers?: LylaRequestHeaders
  /**
   * Type of `response.body`.
   */
  responseType?: 'arraybuffer' | 'blob' | 'text'
  body?: XMLHttpRequestBodyInit
  /**
   * JSON value to be written into the request body. It can't be used with
   * `body`.
   */
  json?: any
  /**
   * Query object, also known as search params.
   * Note, if you want to set `null` or `undefined` as value in query,
   * use object like `query: { key: "undefined" }` instead of `query: { key: undefined }`.
   * Otherwise, the k-v pair will be ignored.
   */
  query?: Record<
    string,
    | string
    | number
    | boolean
    | Array<string | number | boolean>
    | null
    | undefined
  >
  baseUrl?: string
  /**
   * Abort signal of the request.
   */
  signal?: AbortSignal
  onUploadProgress?: (progress: LylaProgress<C>) => void
  onDownloadProgress?: (progress: LylaProgress<C>) => void
  /**
   * Whether to allow get request with body. Default is false.
   * It's not recommended to use GET request with body since it doesn't conform HTTP
   * specification.
   */
  allowGetBody?: boolean
  hooks?: {
    /**
     * Callbacks fired when options is passed into the request. In this moment,
     * request options haven't be normalized.
     */
    onInit?: Array<
      (
        options: LylaRequestOptionsWithContext<C>
      ) =>
        | LylaRequestOptionsWithContext<C>
        | Promise<LylaRequestOptionsWithContext<C>>
    >
    /**
     * Callbacks fired before request is sent. In this moment, request options is
     * normalized. The returned options will be normalized again.
     */
    onBeforeRequest?: Array<
      (
        options: LylaNormalizedRequestOptions<C>
      ) =>
        | LylaRequestOptionsWithContext<C>
        | Promise<LylaRequestOptionsWithContext<C>>
    >
    /**
     * Callbacks fired after headers are received.
     *
     * only work in @lylajs/web @lylajs/node and lyla.
     */
    onHeadersReceived?: Array<
      (
        payload: {
          headers: Record<string, string>
          originalRequest: M['originalRequest']
          requestOptions: LylaNormalizedRequestOptions<C>
        },
        reject: (reason: unknown) => void
      ) => void
    >
    /**
     * Callbacks fired after response is received.
     */
    onAfterResponse?: Array<
      (
        response: LylaResponse<any>,
        reject: (reason: unknown) => void
      ) => LylaResponse<any> | Promise<LylaResponse<any>>
    >
    /**
     * Callbacks fired when there's error while response handling. It's only
     * fired by LylaError. Error thrown by user won't triggered the callback,
     * for example if user throws an error in `onAfterResponse` hook. The
     * callback won't be fired.
     *
     * Before the callback if finished, the error won't be thrown.
     */
    onResponseError?: Array<
      (
        error: LylaResponseError<C>,
        reject: (reason: unknown) => void
      ) => void | Promise<void>
    >
    /**
     * Callbacks fired when a non-response error occurs (except
     * BROKEN_ON_NON_RESPONSE_ERROR)
     */
    onNonResponseError?: Array<
      (error: LylaNonResponseError<C>) => void | Promise<void>
    >
  }
  /**
   * Custom context of the request. It's used as is (not cloned). It can't be
   * used together with `createContext`.
   */
  context?: C
  /**
   * Creates the context of the request, based on the context created by
   * `createContext` of `createLyla`. It can't be used together with `context`.
   */
  createContext?: LylaContextFactory<C>
  /**
   * Extra requestion options, these options will be passed to the corresponding
   * request method of the platform. Its type depends on the platform.
   */
  extraOptions?: {}
}
```

#### Type `LylaRequestOptionsWithContext` & `LylaNormalizedRequestOptions`

```ts
/**
 * Request options whose context is resolved. It's received by `onInit`, in
 * which options haven't been normalized.
 */
type LylaRequestOptionsWithContext<C = undefined> = Omit<
  LylaRequestOptions<C>,
  'context'
> & {
  context: C
}

/**
 * Normalized request options. It's received by hooks and callbacks after
 * `onInit`. `url` has been merged with `baseUrl` and `query`, and `method` is
 * in upper case.
 */
type LylaNormalizedRequestOptions<C = undefined> =
  LylaRequestOptionsWithContext<C> & {
    url: string
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'HEAD' | 'DELETE' | ... // platform relevant
    responseType: 'arraybuffer' | 'blob' | 'text' // platform relevant
  }
```

#### Type `LylaResponse`

```ts
type LylaResponse<T = any, C = undefined> = {
  requestOptions: LylaNormalizedRequestOptions<C>
  status: number
  statusText: string
  /**
   * Headers of the response. All the keys are in lower case.
   */
  headers: Record<string, string>
  /**
   * Response body.
   */
  body: PlatformRelevant
  /**
   * JSON value of the response. If body is not valid JSON text, access the
   * field will cause an error.
   */
  json: T
  /**
   * Custom context of the request
   */
  context?: C
}
```

#### Type `LylaProgress`

```ts
type LylaProgress<C> = {
  /**
   * Percentage of the progress. From 0 to 100.
   */
  percent: number
  /**
   * Loaded bytes of the progress.
   */
  loaded: number
  /**
   * Total bytes of the progress. If progress is not length-computable it would
   * be 0.
   */
  total: number
  /**
   * Whether the total bytes of the progress is computable.
   */
  lengthComputable: boolean
  /**
   * Request options of the request.
   */
  requestOptions: LylaNormalizedRequestOptions<C>
}
```

#### Type `LylaRequestHeaders`

```ts
type LylaRequestHeaders = Record<string, string | number | undefined>
```

Request headers can be `string`, `number` or `undefined`. If it's `undefined`,
it would override default options' headers. For example:

```ts
import { createLyla } from '@lylajs/web'

const { lyla } = createLyla({
  headers: { foo: 'bar' },
  createContext: () => null
})

// Request won't have the `foo` header
request.get('http://example.com', { headers: { foo: undefined } })
```

## Error handling

```ts
import { createLyla, LYLA_ERROR } from '@lylajs/web'

const { lyla, isLylaError } = createLyla({ createContext: () => null })

try {
  const { json } = await lyla.get('https://example.com')
  // ...
} catch (e) {
  if (isLylaError(e)) {
    e.type
    // ...
  } else {
    // ...
  }
}
```

As long as lyla is used as its types require, a failed request is always rejected with a `LylaError`, unless it's rejected manually by `reject` of `onHeadersReceived`, `onAfterResponse` or `onResponseError`. In that case it's rejected with the reason as is.

For instances created by `withRetry`, see [Retry request](#retry-request).

### Type `LylaError`

```ts
// This is not a percise definition, it platform relavant. For full definition,
// see https://github.com/07akioni/lyla/blob/main/packages/core/src/error.ts
type LylaError<C = undefined> = {
  name: string
  message: string
  type: LYLA_ERROR
  // LylaError's corresponding original error, for example the error thrown by
  // a hook (`BROKEN_*`), the error of parsing JSON (`INVALID_JSON`), or the
  // error of creating context, serializing `json` or sending the request
  // (`BAD_REQUEST`). In most time, you may need `detail` field.
  error: unknown
  detail: PlatformRelevant // Fail info generated by specific platform
  response: PlatformRelevant // Like LylaResponse | undefined
  // Custom context of the request. It's `undefined` only for `BAD_REQUEST` and
  // `BROKEN_ON_NON_RESPONSE_ERROR` errors raised when `createContext` throws
  context: C | undefined
}
```

### `LYLA_ERROR`

```ts
export enum LYLA_ERROR {
  /**
   * Request encountered an error, fired by XHR `onerror` event. It doesn't mean
   * your network has error, for example CORS error also triggers NETWORK_ERROR.
   */
  NETWORK = 'NETWORK',
  /**
   * Request is aborted.
   */
  ABORTED = 'ABORTED',
  /**
   * Response text is not valid JSON.
   */
  INVALID_JSON = 'INVALID_JSON',
  /**
   * Trying resolving `response.json` with `responseType='arraybuffer'` or
   * `responseType='blob'`.
   */
  INVALID_CONVERSION = 'INVALID_CONVERSION',
  /**
   * Request timeout.
   */
  TIMEOUT = 'TIMEOUT',
  /**
   * HTTP status error.
   */
  HTTP = 'HTTP',
  /**
   * Request `options` is not valid. It's not a response error.
   *
   * It's also raised when `createContext` throws, when `options.json` can't be
   * serialized to JSON, or when the platform refuses to send the request (for
   * example the URL or a header value is invalid). In these cases `error` is
   * the original error.
   */
  BAD_REQUEST = 'BAD_REQUEST',
  /**
   * `onAfterResponse` hook throws error.
   */
  BROKEN_ON_AFTER_RESPONSE = 'BROKEN_ON_AFTER_RESPONSE',
  /**
   * `onBeforeRequest` hook throws error.
   */
  BROKEN_ON_BEFORE_REQUEST = 'BROKEN_ON_BEFORE_REQUEST',
  /**
   * `onInit` hook throws error.
   */
  BROKEN_ON_INIT = 'BROKEN_ON_INIT',
  /**
   * `onResponseError` hook throws error.
   */
  BROKEN_ON_RESPONSE_ERROR = 'BROKEN_ON_RESPONSE_ERROR',
  /**
   * `onNonResponseError` hook throws error.
   */
  BROKEN_ON_NON_RESPONSE_ERROR = 'BROKEN_ON_NON_RESPONSE_ERROR',
  /**
   * `onHeadersReceived` hook throws error.
   */
  BROKEN_ON_HEADERS_RECEIVED = 'BROKEN_ON_HEADERS_RECEIVED',
  /**
   * Lyla instance created with `withRetry` throws an unexpected error. This
   * error isn't created by `lyla` instance itself, but thrown by `createState`,
   * `onRejected` or `onResolved` of `withRetry` or the process of creating retry
   * request options defined by user. It's passed to `onBrokenRetry` of `withRetry`, and is only
   * thrown when `onBrokenRetry` returns it by the reject action.
   *
   * The error won't be created by `lyla` instance that not created with `withRetry`.
   */
  BROKEN_RETRY = 'BROKEN_RETRY'
}
```

### Global error listener

```ts
import { createLyla } from '@lylajs/web'

const { lyla } = createLyla({
  createContext: () => null,
  hooks: {
    onResponseError(error) {
      switch error.type {
        // ...
      }
    },
    onNonResponseError(error) {
       switch error.type {
        // ...
      }
    }
  }
})
```

## Aborting Request

You can use native `AbortController` or `LylaAbortController` to abort requests.

Please note that `LylaAbortController` doesn't polyfill all APIs of
`AbortController`.

```ts
import { createLyla, LylaAbortController } from '@lylajs/web'

const controller = new LylaAbortController()

const { lyla } = createLyla({ createContext: () => null })

lyla.get('url', {
  signal: controller.signal
})

controller.abort()
```

## Context

You can access a context object in hooks, responses & errors. Context is created
for each request by `createContext` of `createLyla`.

```ts
const { lyla, isLylaError } = createLyla({
  createContext: () => ({
    startTime: -1,
    endTime: -1,
    duration: -1
  }),
  hooks: {
    onInit: [
      (options) => {
        options.context.startTime = Date.now()
        return options
      }
    ],
    onResponseError: [
      (options) => {
        options.context.endTime = Date.now()
        options.context.duration =
          options.context.endTime - options.context.startTime
        return options
      }
    ],
    onAfterResponse: [
      (options) => {
        options.context.endTime = Date.now()
        options.context.duration =
          options.context.endTime - options.context.startTime
        return options
      }
    ]
  }
})

lyla.get('/foo').then((response) => {
  console.log(response.context.duration)
})
```

The context of a request is resolved in this way:

- If the request passes `context`, it's used as is (not cloned) and no factory
  is called.
- Otherwise, `createContext` of `createLyla`'s options and overrides are called
  in order, followed by the request's `createContext` if it exists. Each factory
  receives the context created by the previous one as `parent` (`null` for the
  first one).
- If the request passes both `context` and `createContext`, it's rejected with a
  `BAD_REQUEST` error.
- If a factory throws, the request is rejected with a `BAD_REQUEST` error
  without being sent. Its `error` is the thrown error, and its `context` is
  `undefined`. The error is passed to `onNonResponseError` hooks of the
  instance and the request.

```ts
const { lyla } = createLyla(
  { createContext: () => ({ tags: ['base'] }) },
  {
    createContext: (parent) => ({
      tags: [...parent!.context.tags, 'override']
    })
  }
)

// `response.context.tags` is `['base', 'override']`
await lyla.get('/foo')

// `response.context.tags` is `['base', 'override', 'request']`
await lyla.get('/foo', {
  createContext: (parent) => ({
    tags: [...parent!.context.tags, 'request']
  })
})

// `response.context` is `context` itself
const context = { tags: ['custom'] }
await lyla.get('/foo', { context })
```

## Retry request

Beta compatibility. Currently only work in `2.0.0-beta.1` and later versions.

Lyla provides a `withRetry` method to create a lyla instance with retry capability.

`lyla.withRetry(options: LylaWithRetryOptions) => Lyla`

The type `LylaWithRetryOptions` is (simplified version):

```ts
type LylaWithRetryOptions<C, S> = {
  onResolved: (params: {
    state: S
    options: LylaRequestOptions
    context: C
    response: LylaResponse
  }) => Promise<
    | {
        action: 'retry'
        value: () => Promise<LylaRequestOptions> | LylaRequestOptions
      }
    | {
        action: 'resolve'
        value: LylaResponse
      }
    | {
        action: 'reject'
        value: unknown
      }
  >
  onRejected: (params: {
    state: S
    options: LylaRequestOptions
    // It's `undefined` if the request is rejected before its context is
    // created, for example `createContext` throws
    context: C | undefined
    lyla: Lyla
    // It can be a Lyla error, or an error thrown by the user in hooks
    error: unknown
  }) => Promise<
    | {
        action: 'retry'
        value: () => Promise<LylaRequestOptions> | LylaRequestOptions
      }
    | {
        action: 'reject'
        value: unknown
      }
  >
  onBrokenRetry: (params: {
    // It's `undefined` if `createState` throws
    state: S | undefined
    options: LylaRequestOptions | undefined
    // It's `undefined` if the error is thrown by `createState` or when
    // resolving retry options
    context: C | undefined
    lyla: Lyla
    error: LylaBrokenRetryError
  }) => Promise<
    | {
        action: 'retry'
        value: () => Promise<LylaRequestOptions> | LylaRequestOptions
      }
    | {
        action: 'reject'
        value: unknown
      }
  >
  createState: () => S
}
```

The `lyla.withRetry` method returns a new lyla instance with all lyla methods except `retry`. This instance will decide whether to retry, continue, or reject based on the return values of `onResolved`, `onRejected` and `onBrokenRetry`.

`createState` is called at the beginning of each request to create a new state object, which is passed to `onResolved`, `onRejected` and `onBrokenRetry`. You can use this object to store some state, such as retry count.

Here is an example of retrying three times:

```ts
import { createLyla } from '@lylajs/*' // * is the platform you need

const { lyla: _lyla } = createLyla({ createContext: () => null })

const lyla = _lyla.withRetry({
  createState: () => ({
    count: 0
  }),
  onResolved: async ({ response }) => {
    return {
      action: 'resolve',
      value: response
    }
  },
  onRejected: async ({ state, error, options }) => {
    state.count += 1
    if (state.count > 3) {
      return {
        action: 'reject',
        value: error
      }
    } else {
      return {
        action: 'retry',
        // Retry with the original options
        value: () => options
      }
    }
  },
  onBrokenRetry: async ({ error }) => {
    return {
      action: 'reject',
      value: error
    }
  }
})
```

An instance created by `lyla.withRetry` may encounter these errors when sending a request:

1. Any rejection of a request (a `LylaError`, or a reason passed to `reject` of hooks) is passed to `onRejected` as is.
2. A value returned by the reject action, whether it's a Lyla error or not, will be thrown directly without being wrapped.
3. An exception thrown by `createState`, `onResolved` or `onRejected`, or an exception thrown by the value function of the retry action, will be wrapped into a `BROKEN_RETRY` type error and passed to `onBrokenRetry`. `onBrokenRetry` decides whether to reject (throw its `value` directly) or retry. To throw the `BROKEN_RETRY` error, return `{ action: 'reject', value: error }`. If `createState` throws, `state` passed to `onBrokenRetry` is `undefined`, and `createState` is called again before the retried request is sent.
4. An exception thrown by `onBrokenRetry` will be thrown directly without being wrapped.

The `BROKEN_RETRY` error won't be caught by any hook and won't be judged as `true` by `isLylaError`. If you need to judge the error, you need to use `isLylaErrorWithRetry`, which will judge all Lyla Errors.

## FAQ

- Why not axios？
  - `axios.defaults` will be applied to all axios instances created by `axios.create`, which means your code may be influenced unexpectedly by others. The behavior can't be changed by any options.
  - `axios.defaults` is a global singleton, which means you can't get a clean copy of it. Since your code may run after than others' code that modifies it.
  - axios will transform invalid JSON to string sliently by default.
  - axios can't access an typed context object in request processes.
- Why not ky？
  - ky is based on fetch, it can't support upload progress.
  - ky is based on fetch, it can't access headers before response is fully resolved.
  - ky's Response data type can't be typed.
  - ky can't access an typed context object in request processes.
