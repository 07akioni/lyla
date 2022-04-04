# lyla

An HTTP client with explicit behavior & error handling for the browser.

English · [中文](https://github.com/07akioni/lyla/blob/main/README.zh_CN.md)

- Won't transform response body implicitly (For example transform invalid JSON to string).
- Won't suppress expection silently (JSON parse error, config error, eg.).
- Explicitly error handling.
- Supports typescript for response data.
- Supports upload progress (which isn't supported by fetch API).

For difference compared with other libs, see [FAQ](/#FAQ).

## Installation

```bash
npm i lyla # for npm
pnpm i lyla # for pnpm
yarn add lyla # for yarn
```

## Usage

```ts
import { lyla } from 'lyla'

const { json } = await lyla.post('https://example.com', {
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
  onUploadProgress?: (
    progress: LylaProgress,
    progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void
  onDownloadProgress?: (
    progress: LylaProgress,
    progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void
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
  status: number
  statusText: string
  /**
   * Headers of the response. All the keys are in lower case.
   */
  headers: Record<string, string>
  /**
   * Response body.
   */
  body: string | ArrayBuffer | Blob
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

#### Type `LylaResponseHeaders`

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

### `lyla.extend(options: LylaRequestOptions | ((options: LylaRequestOptions) => LylaRequestOptions)): Lyla`

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

### Global error handling

```ts
import type { LylaError } from 'lyla'

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

- Why not use axios？
  - `axios.defaults` will be applied to all axios instances, which means your
    code may be influenced unexpectedly by others. The behavior can't be
    changed by any options.
  - axios will transform invalid JSON to string sliently be default.
- Why not ky？
  - ky is based on fetch, it can't support upload progress.
  - ky's Response data type can't be typed.
