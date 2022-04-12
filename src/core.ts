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
import { LylaAdapter } from './adapters/type.js'

function isOkStatus(status: number): boolean {
  return 200 <= status && status < 300
}

function createLyla(
  lylaOptions: LylaRequestOptions & { adapter: LylaAdapter }
): Lyla {
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
            message:
              "`options.query` can't be set if `options.url` contains '?'",
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
      withCredentials = false,
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

    let _resolve: (value: LylaResponse<T>) => void
    let _reject: (value: LylaError) => void

    // make request headers
    const requestHeaders: Record<string, string> = {}
    mergeHeaders(requestHeaders, lylaOptions.headers)
    mergeHeaders(requestHeaders, options.headers)
    // Set 'content-type' header
    if (_options.json !== undefined) {
      requestHeaders['content-type'] =
        requestHeaders['content-type'] ?? 'application/json'
    }
    requestHeaders['accept'] = requestHeaders.accept ?? '*/*'
    _options.headers = requestHeaders
    
    let settled = false
    function cleanup() {
      settled = true
      if (signal) {
        signal.removeEventListener('abort', onAbortSignalReceived)
      }
    }

    let aborted = false
    function onAbortSignalReceived() {
      if (aborted) return
      aborted = true
      const error = defineLylaError<LylaAbortedError>(
        {
          type: LYLA_ERROR.ABORTED,
          message: 'Request aborted',
          event: undefined,
          error: undefined,
          response: undefined
        },
        stack
      )
      handleResponseError(error)
      _reject(error)
      adapterHandle.abort()
    }

    if (signal) {
      signal.addEventListener('abort', onAbortSignalReceived)
    }

    const adapterHandle = lylaOptions.adapter({
      url,
      method,
      body,
      json: _options.json,
      headers: requestHeaders,
      responseType,
      withCredentials,
      onNetworkError({ e }) {
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
      },
      onDownloadProgress,
      onUploadProgress,
      async onResponse(resp, e) {
        if (aborted) return
        cleanup()
        let _json: any
        let _jsonIsSet = false
        let _cachedJson: any
        let _cachedJsonParsingError: TypeError
        let response: LylaResponse = {
          requestOptions: _options,
          status: resp.status,
          statusText: resp.statusText,
          headers: resp.headers,
          body: resp.body,
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
                return (_cachedJson = JSON.parse(resp.body as string))
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

        if (!isOkStatus(resp.status)) {
          const reason = `${resp.status} ${resp.statusText}`
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
      }
    })

    const requestPromise = new Promise<LylaResponse<T>>((resolve, reject) => {
      _resolve = resolve
      _reject = (e) => {
        cleanup()
        reject(e)
      }
    })

    if (timeout) {
      setTimeout(() => {
        if (settled) return
        adapterHandle.abort()
        aborted = true
        const error = defineLylaError<LylaTimeoutError>(
          {
            type: LYLA_ERROR.TIMEOUT,
            message: timeout
              ? `Timeout of ${timeout}ms exceeded`
              : 'Timeout exceeded',
            event: undefined,
            error: undefined,
            response: undefined
          },
          stack
        )
        handleResponseError(error)
        _reject(error)
      }, timeout)
    }
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
    const extendedOptions = mergeOptions<
      LylaRequestOptions & { adapter: LylaAdapter }
    >(lylaOptions, options)
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
