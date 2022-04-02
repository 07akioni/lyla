# lyla

Lyla is an explicit request library for browser.

- Won't transform data without explicit config.
- Won't suppress expection silently (JSON parse error, config error, eg.).
- Explicitly error handling.
- Supports typescript for response data.
- Supports upload progress.

## Installation

```
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

### lyla<T>(options: LylaRequestOptions): LylaResponse<T>

### lyla.get<T>(options: LylaRequestOptions): LylaResponse<T>

### lyla.post<T>(options: LylaRequestOptions): LylaResponse<T>

### lyla.put<T>(options: LylaRequestOptions): LylaResponse<T>

### lyla.patch<T>(options: LylaRequestOptions): LylaResponse<T>

### lyla.head<T>(options: LylaRequestOptions): LylaResponse<T>

### lyla.delete<T>(options: LylaRequestOptions): LylaResponse<T>

### lyla.extend(options: LylaRequestOptions): Lyla

#### LylaRequestOptions

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
    | 'delete'
  timeout?: number
  withCredentials?: boolean
  headers?: Record<string, string>
  responseType?: Exclude<XMLHttpRequestResponseType, 'document' | 'json' | ''>
  body?: XMLHttpRequestBodyInit
  json?: any
  query?: Record<string, string>
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

#### LylaResponse

```ts
type LylaResponse<T = any> = {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string | ArrayBuffer | Blob
  json: T
}
```

#### LylaProgress

```ts
type LylaProgress = {
  percent: number
  loaded: number
  total: number
  lengthComputable: boolean
}
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
