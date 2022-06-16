# lyla · [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT) [![ci](https://github.com/07akioni/lyla/actions/workflows/node.js.yml/badge.svg)](https://github.com/07akioni/lyla/actions/workflows/node.js.yml/badge.svg) [![npm version](https://badge.fury.io/js/lyla.svg)](https://badge.fury.io/js/lyla) [![minzipped size](https://badgen.net/bundlephobia/minzip/lyla)](https://badgen.net/bundlephobia/minzip/lyla)

An group of HTTP clients with explicit behavior & error handling.

| Environment               | Package       |
| ------------------------- | ------------- |
| web                       | `@lylajs/web` |
| toutiao miniprogram       | `@lylajs/tt`  |
| weixin miniprogram        | `@lylajs/wx`  |
| qq miniprogram            | `@lylajs/qq`  |
| zhifubao miniprogram      | `@lylajs/my`  |
| web (okay) + nodejs (wip) | `lyla`        |

English · [中文](https://github.com/07akioni/lyla/blob/main/README.zh_CN.md)

- Won't share options between different instances, which means your reqeust won't be unexpectedly modified.
- Won't transform response body implicitly (For example transform invalid JSON to string).
- Won't suppress expection silently (JSON parse error, config error, eg.).
- [Explicit error handling](#error-handling).
- Supports typescript for response data.
- Supports upload progress (which isn't supported by fetch API).
- Friendly error tracing (with sync trace, you can see where the request is sent on error).

For difference compared with other libs, see [FAQ](#faq).

## Installation

```bash
# you can install `lyla` or `@lylajs/xxx`
npm i lyla # for npm
pnpm i lyla # for pnpm
yarn add lyla # for yarn
```

## Usage

```ts
import { lyla } from 'lyla' // or @lylajs/xxx

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
type LylaRequestOptions = {
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
  onUploadProgress?: (progress: LylaProgress) => void
  onDownloadProgress?: (progress: LylaProgress) => void
  hooks?: {
    /**
     * Callbacks fired when options is passed into the request. In this moment,
     * request options haven't be normalized.
     */
    onInit?: Array<
      (
        options: LylaRequestOptions
      ) => LylaRequestOptions | Promise<LylaRequestOptions>
    >
    /**
     * Callbacks fired before request is sent. In this moment, request options is
     * normalized.
     */
    onBeforeRequest?: Array<
      (
        options: LylaRequestOptions
      ) => LylaRequestOptions | Promise<LylaRequestOptions>
    >
    /**
     * Callbacks fired after response is received.
     */
    onAfterResponse?: Array<
      (
        reqsponse: LylaResponse<any>
      ) => LylaResponse<any> | Promise<LylaResponse<any>>
    >
    /**
     * Callbacks fired when there's error while response handling. It's only
     * fired by LylaError. Error thrown by user won't triggered the callback,
     * for example if user throws an error in `onAfterResponse` hook. The
     * callback won't be fired.
     */
    onResponseError?: Array<(error: LylaResponseError) => void>
  }
}
```

#### Type `LylaResponse`

```ts
type LylaResponse<T = any> = {
  requestOptions: LylaRequestOptions
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
}
```

#### Type `LylaProgress`

```ts
type LylaProgress = {
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
}
```

#### Type `LylaRequestHeaders`

```ts
type LylaRequestHeaders = Record<string, string | number | undefined>
```

Request headers can be `string`, `number` or `undefined`. If it's `undefined`,
it would override default options' headers. For example:

```ts
import { lyla } from 'lyla'

const request = lyla.extend({ headers: { foo: 'bar' } })

// Request won't have the `foo` header
request.get('http://example.com', { headers: { foo: undefined } })
```

### `lyla.extend(options: LylaRequestOptions): Lyla`

Create a new lyla instance base on current lyla and new default options.

```ts
import { lyla } from 'lyla'

const request = lyla.extend({ baseUrl: 'http://example.com' })

request.get() // ...
```

## Error handling

```ts
import { catchError, matchError, LYLA_ERROR } from 'lyla'

// promise style
lyla
  .get('https://example.com')
  .then((resp) => {
    console.log(resp.json)
  })
  .catch(catchError(({ lylaError, error }) => {
    // Only one of lylaError and error is not undefined, if lylaError exists, it
    // means the error is triggered by lyla
    if (lylaError) {
      switch lylaError.type {
        LYLA_ERROR.INVALID_JSON:
          console.log('json parse error')
          break
        default:
          console.log('some error')
      }
    }
  }))

// async style
try {
  const { json } = await lyla.get('https://example.com')
} catch (e) {
  matchError(e, ({ lylaError, error }) => {
    // ...
  })
}
```

### Type `LylaError`

```ts
// This is not a percise definition, it platform relavant. For full definition,
// see https://github.com/07akioni/lyla/blob/main/packages/core/src/error.ts
type LylaError = {
  name: string
  message: string
  type: LYLA_ERROR
  // LylaError's corresponding original error. Normally it's useless, only
  // invalid JSON will set this field. In most time, you may need `detail` field.
  error: Error | undefined
  detail: PlatformRelevant // Fail info generated by specific platform
  response: PlatformRelevant // Like LylaResponse | undefined
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
  BAD_REQUEST = 'BAD_REQUEST'
}
```

### Global error listener

```ts
import type { LylaResponseError } from 'lyla'

const request = lyla.extend({
  hooks: {
    onResponseError(error: LylaResponseError) {
      switch error.type {
        // ...
      }
    }
  }
})
```

## FAQ

- Why not axios？
  - `axios.defaults` will be applied to all axios instances created by `axios.create`, which means your code may be influenced unexpectedly by others. The behavior can't be changed by any options.
  - `axios.defaults` is a global singleton, which means you can't get a clean copy of it. Since your code may run after than others' code that modifies it.
  - axios will transform invalid JSON to string sliently by default.
- Why not ky？
  - ky is based on fetch, it can't support upload progress.
  - ky's Response data type can't be typed.
