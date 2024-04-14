# lyla · [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) [![ci](https://github.com/07akioni/lyla/actions/workflows/node.js.yml/badge.svg)](https://github.com/07akioni/lyla/actions/workflows/node.js.yml/badge.svg) [![npm version](https://badge.fury.io/js/lyla.svg)](https://badge.fury.io/js/lyla) [![minzipped size](https://badgen.net/bundlephobia/minzip/lyla)](https://badgen.net/bundlephobia/minzip/lyla)

A fully typed HTTP client with explicit behavior & error handling.

> [!IMPORTANT]  
> If you only want to support browser environment, you should use package `@lylajs/web` instead of `lyla`.

| Environment          | Package        | Note                                                                                            |
| -------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| web                  | `@lylajs/web`  |                                                                                                 |
| node                 | `@lylajs/node` |                                                                                                 |
| toutiao miniprogram  | `@lylajs/tt`   |                                                                                                 |
| weixin miniprogram   | `@lylajs/wx`   |                                                                                                 |
| qq miniprogram       | `@lylajs/qq`   |                                                                                                 |
| zhifubao miniprogram | `@lylajs/my`   |                                                                                                 |
| web + nodejs         | `lyla`         | Unless you have explicit cross-platform isomorphic requirements, please don't use this package. |

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

```ts
import { createLyla } from '@lylajs/web'

// For request which need default options, hooks or custom context info,
// it's recommended using `createLyla` to create lyla instance.
// If you only need the simplest usage, you can use
// import { lyla } from '@lylajs/web'
const { lyla } = createLyla({ context: null })
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
  options: LylaRequestOptions<C> & { context: C },
  ...overrides: LylaRequestOptions<C>[]
): { lyla: Lyla; isLylaError: (e: unknown) => e is LylaError }
```

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
  query?: Record<string, string | number>
  baseUrl?: string
  /**
   * Abort signal of the request.
   */
  signal?: AbortSignal
  onUploadProgress?: (progress: LylaProgress<C>) => void
  onDownloadProgress?: (progress: LylaProgress<C>) => void
  hooks?: {
    /**
     * Callbacks fired when options is passed into the request. In this moment,
     * request options haven't be normalized.
     */
    onInit?: Array<
      (
        options: LylaRequestOptions<C>
      ) => LylaRequestOptions<C> | Promise<LylaRequestOptions<C>>
    >
    /**
     * Callbacks fired before request is sent. In this moment, request options is
     * normalized.
     */
    onBeforeRequest?: Array<
      (
        options: LylaRequestOptions<C>
      ) => LylaRequestOptions<C> | Promise<LylaRequestOptions<C>>
    >
    /**
     * Callbacks fired after headers are received.
     *
     * only work in @lylajs/web @lylajs/node and lyla
     */
    onHeadersReceived?: Array<
      (
        payload: {
          headers: Record<string, string>
          originalRequest: M['originalRequest']
          requestOptions: LylaRequestOptionsWithContext<C, M>
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
     */
    onResponseError?: Array<
      (
        error: LylaResponseError<C, M>,
        reject: (reason: unknown) => void
      ) => void
    >
    /**
     * Callbacks fired when a non-response error occurs (except BROKEN_ON_NON_RESPONSE_ERROR)
     */
    onNonResponseError?: Array<
      (error: LylaNonResponseError<C, M>) => void | Promise<void>
    >
  }
  /**
   * Custom context of the request
   */
  context?: C
}
```

#### Type `LylaResponse`

```ts
type LylaResponse<T = any, C = undefined> = {
  requestOptions: LylaRequestOptions<C>
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
  requestOptions: LylaRequestOptions<C>
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

const { lyla } = createLyla({ headers: { foo: 'bar' }, context: null })

// Request won't have the `foo` header
request.get('http://example.com', { headers: { foo: undefined } })
```

## Error handling

```ts
import { createLyla, LYLA_ERROR } from '@lylajs/web'

const { lyla, isLylaError } = createLyla({ context: null })

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

### Type `LylaError`

```ts
// This is not a percise definition, it platform relavant. For full definition,
// see https://github.com/07akioni/lyla/blob/main/packages/core/src/error.ts
type LylaError<C = undefined> = {
  name: string
  message: string
  type: LYLA_ERROR
  // LylaError's corresponding original error. Normally it's useless, only
  // invalid JSON will set this field. In most time, you may need `detail` field.
  error: Error | undefined
  detail: PlatformRelevant // Fail info generated by specific platform
  response: PlatformRelevant // Like LylaResponse | undefined
  // Custom context of the request
  context: C
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
  BROKEN_ON_HEADERS_RECEIVED = 'BROKEN_ON_HEADERS_RECEIVED'
}
```

### Global error listener

```ts
import { createLyla } from '@lylajs/web'

const { lyla } = createLyla({
  context: null,
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

const { lyla } = createLyla({ context: null })

lyla.get('url', {
  signal: controller.signal
})

controller.abort()
```

## Context

You can access a context object in hooks, responses & errors.

```ts
const { lyla, isLylaError } = createLyla({
  context: {
    startTime: -1,
    endTime: -1,
    duration: -1
  },
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
