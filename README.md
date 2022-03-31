# ceek

Ceek is an explicit request library for browser.

- Won't transform data without explicit config.
- Won't suppress expection silently (JSON parse error, config error, eg.).
- Explicitly error handling.
- Supports typescript for response data.
- Supports upload progress.

## Usage

```ts
import { ceek } from 'ceek'

const { json } = await ceek.post('https://example.com', {
  json: { foo: 'bar' }
})
```

## API

### ceek<T>(options: CeekRequestOptions): CeekResponse<T>

#### CeekRequestOptions

```ts
type CeekRequestOptions = {
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

#### CeekResponse

```ts
export type CeekResponse<T = any> = {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string | ArrayBuffer | Blob
  json: T
}
```
