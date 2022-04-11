import { responseTypes } from './constants.js'
import {
  defineLylaError,
  LylaBadRequestError,
  LylaResponseError,
  LYLA_ERROR
} from './error.js'
import { mergeUrl, mergeHeaders, mergeOptions } from './utils.js'
import type {
  LylaAbortedError,
  LylaError,
  LylaHttpError,
  LylaInvalidConversionError,
  LylaInvalidJSONError,
  LylaNetworkError,
  LylaTimeoutError
} from './error.js'
import type { LylaRequestOptions, LylaResponse, Lyla } from './types.js'

function isOkStatus(status: number): boolean {
  return 200 <= status && status < 300
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

function createLyla(lylaOptions: LylaRequestOptions = {}): Lyla {
  async function request<T = any>(
    options: LylaRequestOptions
  ): Promise<LylaResponse<T>> {
    if (lylaOptions?.hooks?.onInit) {
      for (const hook of lylaOptions.hooks.onInit) {
        options = await hook(options)
      }
    }
    if (options?.hooks?.onInit) {
      for (const hook of options.hooks.onInit) {
        options = await hook(options)
      }
    }

    let _options: LylaRequestOptions = mergeOptions(lylaOptions, options)

    _options.method = _options.method?.toUpperCase() as any
    _options.responseType = options.responseType || 'text'
    _options.url = _options.url || ''

    if (_options.baseUrl) {
      _options.url = mergeUrl(_options.baseUrl, _options.url)
    }

    let stack: string | undefined
    try {
      stack = new Error().stack?.replace(/^Error/, '')
    } catch (_) {}

    // Resolve query string, patch it to URL
    if (_options.query) {
      const urlSearchParams = new URLSearchParams(
        _options.query as Record<string, string>
      )
      const queryString = urlSearchParams.toString()
      if (_options.url.includes('?')) {
        throw defineLylaError<LylaBadRequestError>(
          {
            type: LYLA_ERROR.BAD_REQUEST,
            message: "`options.query` can't be set if `options.url` contains '?'",
            event: undefined,
            error: undefined,
            response: undefined
          },
          undefined
        )
      }
      if (queryString.length) {
        _options.url = _options.url + '?' + queryString
      }
    }

    if (_options.hooks?.onBeforeRequest) {
      for (const hook of _options.hooks?.onBeforeRequest) {
        _options = await hook(_options)
      }
    }

    // Move json data to body as string
    if (_options.json !== undefined) {
      if (_options.body !== undefined) {
        throw defineLylaError<LylaBadRequestError>(
          {
            type: LYLA_ERROR.BAD_REQUEST,
            message:
              "`options.json` can't be used together `options.body`. If you want to use `options.json`, you should left `options.body` as `undefined`",
            event: undefined,
            error: undefined,
            response: undefined
          },
          undefined
        )
      }
      _options.body = JSON.stringify(_options.json)
    }

    const {
      timeout,
      url = '',
      method = 'get',
      body,
      responseType = 'text',
      withCredentials,
      signal,
      onUploadProgress,
      onDownloadProgress
    } = _options

    async function handleResponseError(error: LylaResponseError) {
      if (_options.hooks?.onResponseError) {
        for (const hook of _options.hooks?.onResponseError) {
          await hook(error)
        }
      }
    }

    function cleanup() {
      if (signal) {
        signal.removeEventListener('abort', onAbortSignalReceived)
      }
    }

    function onAbortSignalReceived() {
      xhr.abort()
    }

    const xhr = new XMLHttpRequest()
    xhr.open(method, url)

    if (signal) {
      signal.addEventListener('abort', onAbortSignalReceived)
    }

    let _resolve: (value: LylaResponse<T>) => void
    let _reject: (value: LylaError) => void

    // make request headers
    const requestHeaders: Record<string, string> = {}
    const _headers = new Headers()
    mergeHeaders(_headers, lylaOptions.headers)
    mergeHeaders(_headers, options.headers)
    _headers.forEach((value, key) => {
      xhr.setRequestHeader(key, value)
      requestHeaders[key] = value
    })
    _options.headers = requestHeaders

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
    xhr.withCredentials = !!withCredentials

    const requestPromise = new Promise<LylaResponse<T>>((resolve, reject) => {
      _resolve = resolve
      _reject = (e) => {
        cleanup()
        reject(e)
      }
    })

    xhr.responseType = responseType
    if (timeout) {
      xhr.addEventListener('timeout', (e) => {
        const error = defineLylaError<LylaTimeoutError>(
          {
            type: LYLA_ERROR.TIMEOUT,
            message: timeout
              ? `Timeout of ${timeout}ms exceeded`
              : 'Timeout exceeded',
            event: e,
            error: undefined,
            response: undefined
          },
          stack
        )
        handleResponseError(error)
        _reject(error)
      })
    }
    xhr.addEventListener('error', (e) => {
      const error = defineLylaError<LylaNetworkError>(
        {
          type: LYLA_ERROR.NETWORK,
          message: 'Network error',
          event: e,
          error: undefined,
          response: undefined
        },
        stack
      )
      handleResponseError(error)
      _reject(error)
    })
    if (onUploadProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        onUploadProgress(
          {
            lengthComputable: e.lengthComputable,
            percent: e.lengthComputable ? (e.loaded / e.total) * 100 : 0,
            loaded: e.loaded,
            total: e.total
          },
          e
        )
      })
    }
    if (onDownloadProgress) {
      xhr.addEventListener('progress', (e) => {
        onDownloadProgress(
          {
            lengthComputable: e.lengthComputable,
            percent: e.lengthComputable ? (e.loaded / e.total) * 100 : 0,
            loaded: e.loaded,
            total: e.total
          },
          e
        )
      })
    }
    xhr.addEventListener('loadend', async (e) => {
      if (aborted) return
      cleanup()
      let _json: any
      let _jsonIsSet = false
      let _cachedJson: any
      let _cachedJsonParsingError: TypeError
      let response: LylaResponse = {
        requestOptions: _options,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: createHeaders(xhr.getAllResponseHeaders()),
        body: xhr.response,
        set json(value: any) {
          _jsonIsSet = true
          _json = value
        },
        get json() {
          if (_jsonIsSet) return _json
          if (responseType !== 'text') {
            const error = defineLylaError<LylaInvalidConversionError>(
              {
                type: LYLA_ERROR.INVALID_CONVERSION,
                message: `Can not convert ${responseType} to JSON`,
                event: undefined,
                error: undefined,
                response
              },
              undefined
            )
            handleResponseError(error)
            throw error
          }
          if (_cachedJson === undefined) {
            try {
              return (_cachedJson = JSON.parse(xhr.response))
            } catch (e) {
              _cachedJsonParsingError = e as TypeError
            }
          } else {
            return _cachedJson
          }
          if (_cachedJsonParsingError) {
            const error = defineLylaError<LylaInvalidJSONError>(
              {
                type: LYLA_ERROR.INVALID_JSON,
                message: _cachedJsonParsingError.message,
                event: undefined,
                error: _cachedJsonParsingError,
                response
              },
              undefined
            )
            handleResponseError(error)
            throw error
          }
        }
      }

      if (!isOkStatus(xhr.status)) {
        const reason = `${xhr.status} ${xhr.statusText}`
        const error = defineLylaError<LylaHttpError>(
          {
            type: LYLA_ERROR.HTTP,
            message: `Request failed with ${reason}`,
            event: e,
            error: undefined,
            response
          },
          stack
        )
        handleResponseError(error)
        _reject(error)
      }

      if (_options.hooks?.onAfterResponse) {
        for (const hook of _options.hooks.onAfterResponse) {
          response = await hook(response)
        }
      }

      _resolve(response)
    })
    let aborted = false
    xhr.addEventListener('abort', (e) => {
      aborted = true
      const error = defineLylaError<LylaAbortedError>(
        {
          type: LYLA_ERROR.ABORTED,
          message: 'Request aborted',
          event: e,
          error: undefined,
          response: undefined
        },
        stack
      )
      handleResponseError(error)
      _reject(error)
    })
    if (method === 'GET' && body) {
      throw defineLylaError<LylaBadRequestError>(
        {
          type: LYLA_ERROR.BAD_REQUEST,
          message: "Can not send a request with body in 'GET' method.",
          error: undefined,
          response: undefined,
          event: undefined
        },
        undefined
      )
    }
    xhr.send(body)
    return requestPromise
  }

  function createRequestShortcut(method: LylaRequestOptions['method']) {
    return <T>(
      url: string,
      options?: Omit<LylaRequestOptions, 'url' | 'method'>
    ): Promise<LylaResponse<T>> => {
      return request<T>({
        ...options,
        method,
        url
      })
    }
  }

  function extend(options?: LylaRequestOptions): Lyla {
    const extendedOptions = mergeOptions(lylaOptions, options)
    return createLyla(extendedOptions)
  }

  return Object.assign(request, {
    extend,
    get: createRequestShortcut('get'),
    post: createRequestShortcut('post'),
    put: createRequestShortcut('put'),
    patch: createRequestShortcut('patch'),
    head: createRequestShortcut('head'),
    delete: createRequestShortcut('delete'),
    options: createRequestShortcut('options')
  })
}

export { createLyla }
