import { responseTypes } from './constants.js'
import { defineLylaError, CEEK_ERROR } from './error.js'
import { mergeUrl } from './utils.js'
import type {
  LylaAbortedError,
  LylaError,
  LylaHttpError,
  LylaInvalidTransformationError,
  LylaInvalidJSONError,
  LylaNetworkError,
  LylaTimeoutError
} from './error.js'
import type { LylaRequestOptions, LylaResponse, LylaOptions } from './types.js'

export interface Lyla {
  <T = any>(options: LylaRequestOptions): Promise<LylaResponse<T>>
  extend: (
    options?: LylaOptions | ((options: LylaOptions) => LylaOptions)
  ) => Lyla
  get: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions, 'url' | 'method'>
  ) => Promise<LylaResponse<T>>
  post: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions, 'url' | 'method'>
  ) => Promise<LylaResponse<T>>
  put: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions, 'url' | 'method'>
  ) => Promise<LylaResponse<T>>
  patch: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions, 'url' | 'method'>
  ) => Promise<LylaResponse<T>>
  head: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions, 'url' | 'method'>
  ) => Promise<LylaResponse<T>>
  delete: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions, 'url' | 'method'>
  ) => Promise<LylaResponse<T>>
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

function createLyla(lylaOptions: LylaOptions = {}): Lyla {
  const {
    hooks: { onBeforeOptionsNormalized, onBeforeRequest, onAfterResponse } = {}
  } = lylaOptions

  async function request<T = any>(
    options: LylaRequestOptions
  ): Promise<LylaResponse<T>> {
    if (onBeforeOptionsNormalized) {
      for (const hook of onBeforeOptionsNormalized) {
        options = await hook(options)
      }
    }

    let _options: LylaRequestOptions = {
      ...options,
      baseUrl: options.baseUrl ?? lylaOptions.baseUrl,
      method: options.method.toUpperCase() as any
    }

    _options.responseType = options.responseType || 'text'

    if (_options.baseUrl) {
      _options.url = mergeUrl(_options.baseUrl, _options.url)
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

    if (onBeforeRequest) {
      for (const hook of onBeforeRequest) {
        _options = await hook(_options)
      }
    }

    // Move json data to body as string
    if (_options.json !== undefined) {
      _options.body = JSON.stringify(_options.json)
    }

    const {
      timeout,
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

    let _resolve: (value: LylaResponse<T>) => void
    let _reject: (value: LylaError) => void

    // make request headers
    const requestHeaders: Record<string, string> = {}
    const _headers = new Headers({ ...lylaOptions.headers, ...headers })
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

    const requestPromise = new Promise<LylaResponse<T>>((resolve, reject) => {
      _resolve = resolve
      _reject = reject
    })

    xhr.responseType = responseType
    if (timeout) {
      xhr.addEventListener('timeout', (e) => {
        _reject(
          defineLylaError<LylaTimeoutError>({
            type: CEEK_ERROR.TIMEOUT,
            message: 'Timeout',
            event: e,
            error: undefined,
            response: undefined
          })
        )
      })
    }
    xhr.addEventListener('error', (e) => {
      _reject(
        defineLylaError<LylaNetworkError>({
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
    xhr.addEventListener('loadend', async (e) => {
      let json: any
      let jsonParseError: TypeError
      let jsonFieldSet = false

      let response: LylaResponse = {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: createHeaders(xhr.getAllResponseHeaders()),
        body: xhr.response,
        set json(value: any) {
          jsonFieldSet = true
          json = value
        },
        get json() {
          if (jsonFieldSet) return json
          if (typeof xhr.response !== 'string') {
            throw defineLylaError<LylaInvalidTransformationError>({
              type: CEEK_ERROR.INVALID_TRANSFORMATION,
              message: `Can not convert ${responseType} to JSON`,
              event: undefined,
              error: undefined,
              response
            })
          }
          if (json === undefined) {
            try {
              json = JSON.parse(xhr.response)
            } catch (e) {
              jsonParseError = e
            }
          }
          if (jsonParseError) {
            throw defineLylaError<LylaInvalidJSONError>({
              type: CEEK_ERROR.INVALID_JSON,
              message: jsonParseError.message,
              event: undefined,
              error: jsonParseError,
              response
            })
          }
          return json
        }
      }

      if (!isOkStatus(xhr.status)) {
        const reason = `${xhr.status} ${xhr.statusText}`
        _reject(
          defineLylaError<LylaHttpError>({
            type: CEEK_ERROR.HTTP,
            message: `Request Failed with ${reason}`,
            event: e,
            error: undefined,
            response
          })
        )
      }

      if (onAfterResponse) {
        for (const hook of onAfterResponse) {
          response = await hook(response)
        }
      }

      _resolve(response)
    })
    xhr.addEventListener('abort', (e) => {
      _reject(
        defineLylaError<LylaAbortedError>({
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

  function createRequestShortcut(method: LylaRequestOptions['method']) {
    return <T>(
      url: string,
      options: Omit<LylaRequestOptions, 'url' | 'method'>
    ): Promise<LylaResponse<T>> => {
      return request<T>({
        ...options,
        method,
        url
      })
    }
  }

  function extend(
    options: LylaOptions | ((options: LylaOptions) => LylaOptions)
  ): Lyla {
    const extendedOptions =
      typeof options === 'function'
        ? options(lylaOptions)
        : { ...options, ...lylaOptions }
    return createLyla(extendedOptions)
  }

  return Object.assign(request, {
    extend,
    get: createRequestShortcut('get'),
    post: createRequestShortcut('post'),
    put: createRequestShortcut('put'),
    patch: createRequestShortcut('patch'),
    head: createRequestShortcut('head'),
    delete: createRequestShortcut('delete')
  })
}

export { createLyla }
