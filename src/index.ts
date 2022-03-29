import { responseTypes } from './constants'
import {
  CeekAbortedError,
  CeekError,
  CeekHttpError,
  CeekInvalidJSONError,
  CeekNetworkError,
  CEEK_ERROR,
  defineCeekError,
  handleCeekError
} from './error'
import { validateBaseUrl } from './utils'

interface CeekOptions {
  baseUrl?: string
}

interface CeekRequestOptions {
  method: 'get' | 'GET' | 'post' | 'POST'
  url: string
  withCredentials?: boolean
  headers?: Record<string, string>
  responseType?: Exclude<XMLHttpRequestResponseType, 'document'>
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

export interface CeekResponse<T = any> {
  status: number
  statusText: string
  headers: Record<string, string>
  body: T
}

function isOkStatus(status: number): boolean {
  return 200 <= status && status < 300
}

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

function createCeek(ceekOptions: CeekOptions = {}) {
  validateBaseUrl(ceekOptions.baseUrl)

  function request<T = any>(options: CeekRequestOptions) {
    const _options: CeekRequestOptions = {
      ...options,
      baseUrl: options.baseUrl ?? ceekOptions.baseUrl,
      method: options.method.toUpperCase() as any
    }

    validateBaseUrl(_options.baseUrl)

    _options.responseType = options.responseType || 'json'

    if (_options.baseUrl) {
      if (_options.url.startsWith('/')) {
        throw new TypeError(
          '`input` must not begin with a slash when using `baseUrl`'
        )
      }
      _options.url = _options.baseUrl + _options.url
    }

    // Move json data to body as string
    if (_options.json !== undefined) {
      _options.body = JSON.stringify(_options.json)
    }

    // Resolve query string, patch it to URL
    if (_options.query) {
      const urlSearchParams = new URLSearchParams(_options.query)
      const queryString = urlSearchParams.toString()
      if (_options.url.includes('?')) {
        throw new TypeError("`query` can't be set if `url` contains '?'")
      }
      if (queryString.length) {
        _options.url = _options.url + '?' + queryString
      }
    }

    const {
      url,
      method,
      headers,
      body,
      responseType,
      onUploadProgress,
      onDownloadProgress
    } = _options

    const xhr = new XMLHttpRequest()
    xhr.open(method, url)

    let _resolve: (value: CeekResponse<T>) => void
    let _reject: (value: CeekError) => void

    // make request headers
    const requestHeaders: Record<string, string> = {}
    const _headers = new Headers(headers)
    _headers.forEach((value, key) => {
      xhr.setRequestHeader(key, value)
      requestHeaders[key] = value
    })

    // Set 'content-type' header
    if (_options.json !== undefined) {
      xhr.setRequestHeader(
        'content-type',
        _headers.get('content-type') ?? 'application/json'
      )
    }

    // Set 'accept' header
    const accept = _headers.get('accept') ?? responseTypes[responseType]
    xhr.setRequestHeader('accept', accept)

    const requestPromise = new Promise<CeekResponse<T>>((resolve, reject) => {
      _resolve = resolve
      _reject = reject
    })

    xhr.responseType = responseType === 'json' ? 'text' : responseType
    xhr.addEventListener('error', (e) => {
      _reject(
        defineCeekError<CeekNetworkError>({
          type: CEEK_ERROR.NETWORK,
          message: 'Network Error',
          event: e,
          error: undefined,
          response: undefined
        })
      )
    })
    xhr.upload.addEventListener('progress', onUploadProgress)
    xhr.addEventListener('progress', onDownloadProgress)
    xhr.addEventListener('loadend', (e) => {
      let response: CeekResponse = {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: createHeaders(xhr.getAllResponseHeaders()),
        body: ''
      }

      let body: any = ''
      let jsonParseError: TypeError

      try {
        body = responseType === 'json' ? JSON.parse(xhr.response) : xhr.response
      } catch (e) {
        body = xhr.response
        jsonParseError = e
      }

      if (!isOkStatus(xhr.status)) {
        const reason = `${xhr.status} ${xhr.statusText}`
        _reject(
          defineCeekError<CeekHttpError>({
            type: CEEK_ERROR.HTTP,
            message: `Request Failed with ${reason}`,
            event: e,
            error: undefined,
            response
          })
        )
      } else if (jsonParseError) {
        _reject(
          defineCeekError<CeekInvalidJSONError>({
            type: CEEK_ERROR.INVALID_JSON,
            message: jsonParseError.message,
            event: undefined,
            error: jsonParseError,
            response
          })
        )
      }
      _resolve(response)
    })
    xhr.addEventListener('abort', (e) => {
      _reject(
        defineCeekError<CeekAbortedError>({
          type: CEEK_ERROR.ABORTED,
          message: 'JSON Syntax Error',
          event: e,
          error: undefined,
          response: undefined
        })
      )
    })
    if (method === 'GET' && body) {
      throw new Error("Can not send a request with body in 'GET' method.")
    }
    xhr.send(body)
    return requestPromise
  }
  return {
    request
  }
}

export { createCeek, handleCeekError }
