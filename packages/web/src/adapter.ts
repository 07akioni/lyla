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
  networkErrorDetail: ProgressEvent<XMLHttpRequestEventTarget>
  requestBody: XMLHttpRequestBodyInit
  responseDetail: ProgressEvent<XMLHttpRequestEventTarget>
  responseType: 'arraybuffer' | 'blob' | 'text'
  body: XMLHttpRequestBodyInit
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
    const header = (parts[0] || '').trim()
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
  onNetworkError
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
        total: e.total
      })
    })
  }
  if (onDownloadProgress) {
    xhr.addEventListener('progress', (e) => {
      onDownloadProgress({
        lengthComputable: e.lengthComputable,
        percent: e.lengthComputable ? (e.loaded / e.total) * 100 : 0,
        loaded: e.loaded,
        total: e.total
      })
    })
  }
  xhr.addEventListener('loadend', (e) => {
    onResponse(
      {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: createHeaders(xhr.getAllResponseHeaders()),
        body: xhr.response
      },
      e
    )
  })
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
