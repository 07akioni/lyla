import type {
  LylaAdapter,
  LylaAdapterMeta as LylaCoreAdapterMeta
} from '@lylajs/core'

export interface LylaAdapterMeta extends LylaCoreAdapterMeta {
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
    | 'HEAD'
    | 'delete'
    | 'DELETE'
    | 'options'
    | 'OPTIONS'
    | 'connect'
    | 'CONNECT'
    | 'trace'
    | 'TRACE'
  networkErrorDetail: ProgressEvent<XMLHttpRequestEventTarget>
  requestBody: XMLHttpRequestBodyInit
  responseDetail: ProgressEvent<XMLHttpRequestEventTarget>
  progressDetail: ProgressEvent<XMLHttpRequestEventTarget>
  responseType: 'arraybuffer' | 'blob' | 'text'
  originalRequest: XMLHttpRequest
  extraOptions: never
}

// It's possible that the raw http response headers has multiple headers with
// same name. For example:
// header1: value1
// header1: value2
// However when it's resolved by `xhr.getAllResponseHeaders` or
// `Response.Headers.entries`, the resolved value in browsers would be
// `header1: 'value1, value2'`, so there's no need deduplicate the headers
function createHeaders(headers: string): Record<string, string> {
  if (!headers) return {}

  const headerMap: Record<string, string> = {}

  // Convert the header string into an array
  // of individual headers
  const headerPairs = headers.trim().split(/[\r\n]+/)

  headerPairs.forEach(function (line) {
    const parts = line.split(':')
    const header = (parts[0] || '').trim().toLowerCase()
    const value = (parts[1] || '').trim()
    headerMap[header] = value
  })

  return headerMap
}

export const adapter: LylaAdapter<LylaAdapterMeta> = ({
  url,
  method,
  headers,
  body,
  responseType,
  withCredentials,
  onDownloadProgress,
  onUploadProgress,
  onResponse,
  onNetworkError,
  onHeadersReceived
}): {
  abort: () => void
} => {
  const xhr = new XMLHttpRequest()
  xhr.open(method, url)
  xhr.withCredentials = withCredentials
  xhr.responseType = responseType
  for (const [key, value] of Object.entries(headers)) {
    xhr.setRequestHeader(key, value as string)
  }
  if (onUploadProgress) {
    xhr.upload.addEventListener('progress', (e) => {
      onUploadProgress({
        lengthComputable: e.lengthComputable,
        percent: e.lengthComputable ? (e.loaded / e.total) * 100 : 0,
        loaded: e.loaded,
        total: e.total,
        detail: e,
        originalRequest: xhr
      })
    })
  }
  if (onDownloadProgress) {
    xhr.addEventListener('progress', (e) => {
      onDownloadProgress({
        lengthComputable: e.lengthComputable,
        percent: e.lengthComputable ? (e.loaded / e.total) * 100 : 0,
        loaded: e.loaded,
        total: e.total,
        detail: e,
        originalRequest: xhr
      })
    })
  }
  let responseHeaders: Record<string, string> | null = null
  let ensureResponseHeaders = (): Record<string, string> => {
    if (responseHeaders === null) {
      responseHeaders = createHeaders(xhr.getAllResponseHeaders())
    }
    return responseHeaders
  }
  xhr.addEventListener('loadend', (e) => {
    onResponse(
      {
        status: xhr.status,
        headers: ensureResponseHeaders(),
        body: xhr.response
      },
      e
    )
  })
  const _onHeadersReceived = () => {
    if (xhr.readyState === xhr.HEADERS_RECEIVED) {
      if (onHeadersReceived) {
        onHeadersReceived(ensureResponseHeaders(), xhr)
      }
    }
    xhr.removeEventListener('readystatechange', _onHeadersReceived)
  }
  xhr.addEventListener('readystatechange', _onHeadersReceived)
  xhr.addEventListener('error', (e) => {
    onNetworkError(e)
  })
  xhr.send(body)
  return {
    abort() {
      xhr.abort()
    }
  }
}
