# lyla

Lyla is an explicit request library for browser.

- Won't transform data without explicit config.
- Won't suppress expection silently (JSON parse error, config error, eg.).
- Explicitly error handling.
- Supports typescript for response data.
- Supports upload progress.

## Usage

```ts
import { lyla } from 'lyla'

const { json } = await lyla.post('https://example.com', {
  json: { foo: 'bar' }
})
```

## API

### lyla<T>(options: LylaRequestOptions): LylaResponse<T>

#### LylaRequestOptions

```ts
type LylaRequestOptions = {
  method:
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
  url: string
  timeout?: number
  withCredentials?: boolean
  headers?: Record<string, string>
  responseType?: 'arraybuffer' | 'blob' | 'text'
  body?: XMLHttpRequestBodyInit
  json?: any
  query?: Record<string, string>
  baseUrl?: string
  onUploadProgress?: (
    progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void
  onDownloadProgress?: (
    progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void
}
```

#### LylaResponse

```ts
export type LylaResponse<T = any> = {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string | ArrayBuffer | Blob
  json: T
}
```

## Error handling

```ts
import { catchError, matchError, CEEK_ERROR } from 'lyla'

// promise style
lyla
  .get('https://example.com')
  .then((resp) => {
    console.log(resp.json)
  })
  .catch(catchError(({ lylaError, error }) => {
    if (lylaError) {
      switch lylaError.type {
        CEEK_ERROR.INVALID_JSON:
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
