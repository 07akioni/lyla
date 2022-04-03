# lyla

Lyla is an explicit request library for browser.

- Won't transform data without explicit config.
- Won't suppress expection silently (JSON parse error, config error, eg.).
- Explicitly error handling.
- Supports typescript for response data.
- Supports upload progress.

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

### lyla\<T\>(options: LylaRequestOptions): LylaResponse\<T\>

### lyla.get\<T\>(options: LylaRequestOptions): LylaResponse\<T\>

### lyla.post\<T\>(options: LylaRequestOptions): LylaResponse\<T\>

### lyla.put\<T\>(options: LylaRequestOptions): LylaResponse\<T\>

### lyla.patch\<T\>(options: LylaRequestOptions): LylaResponse\<T\>

### lyla.head\<T\>(options: LylaRequestOptions): LylaResponse\<T\>

### lyla.delete\<T\>(options: LylaRequestOptions): LylaResponse\<T\>

#### type LylaRequestOptions

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
  withCredentials?: boolean
  headers?: LylaRequestHeaders
  responseType?: Exclude<XMLHttpRequestResponseType, 'document' | 'json' | ''>
  body?: XMLHttpRequestBodyInit
  json?: any
  query?: Record<string, string | number>
  baseUrl?: string
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
    onBeforeOptionsNormalized?: Array<
      (
        options: LylaRequestOptions
      ) => LylaRequestOptions | Promise<LylaRequestOptions>
    >
    onBeforeRequest?: Array<
      (
        options: LylaRequestOptions
      ) => LylaRequestOptions | Promise<LylaRequestOptions>
    >
    onAfterResponse?: Array<
      (
        reqsponse: LylaResponse<any>
      ) => LylaResponse<any> | Promise<LylaResponse<any>>
    >
  }
}
```

#### type LylaResponse

```ts
type LylaResponse<T = any> = {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string | ArrayBuffer | Blob
  json: T
}
```

#### type LylaProgress

```ts
type LylaProgress = {
  percent: number // 0 - 100
  loaded: number
  total: number
  lengthComputable: boolean
}
```

#### type LylaResponseHeaders

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

### lyla.extend(options: LylaRequestOptions | ((options: LylaRequestOptions) => LylaRequestOptions)): Lyla

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

TODO global error handler

```ts
import type { LylaError } from 'lyla'

const request = lyla.extend({
  onError(error: LylaError) {
    switch error.type {
      // ...
    }
  }
})
```
