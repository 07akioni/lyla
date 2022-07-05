import {
  defineLylaError,
  isLylaError,
  LylaBadRequestError,
  LylaErrorHandler,
  LylaResponseError,
  LYLA_ERROR
} from './error'
import { mergeUrl, mergeHeaders, mergeOptions } from './utils'
import type {
  LylaAbortedError,
  LylaError,
  LylaHttpError,
  LylaInvalidConversionError,
  LylaInvalidJSONError,
  LylaNetworkError,
  LylaTimeoutError
} from './error'
import type {
  LylaRequestOptions,
  LylaResponse,
  Lyla,
  LylaAdapter,
  LylaAdapterMeta
} from './types'
import { getStatusText } from './status'

function isOkStatus(status: number): boolean {
  return 200 <= status && status < 300
}

declare const setTimeout: (callback: () => void, timeout?: number) => number

// It exists both in node, browser, miniprogram environment
declare const URLSearchParams: {
  new (params: Record<string, string>): { toString: () => string }
}

function createLyla<M extends LylaAdapterMeta>(
  lylaOptions: LylaRequestOptions<M> & { adapter: LylaAdapter<M> }
): {
  catchError: <T, E = Error>(
    matcher: LylaErrorHandler<T, E, M>
  ) => (e: any) => T
  matchError: <T, E = Error>(
    error: any,
    matcher: LylaErrorHandler<T, E, M>
  ) => T
  lyla: Lyla<M>
} {
  let _id = 0
  async function request<T = any>(
    options: LylaRequestOptions<M>
  ): Promise<LylaResponse<T, M>> {
    const id = `${_id++}`
    if (lylaOptions?.hooks?.onInit) {
      for (const hook of lylaOptions.hooks.onInit) {
        options = await hook(options, id)
      }
    }
    if (options?.hooks?.onInit) {
      for (const hook of options.hooks.onInit) {
        options = await hook(options, id)
      }
    }

    let _options: LylaRequestOptions<M> = mergeOptions(lylaOptions, options)

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
        throw defineLylaError<M, LylaBadRequestError>(
          {
            type: LYLA_ERROR.BAD_REQUEST,
            message:
              "`options.query` can't be set if `options.url` contains '?'",
            detail: undefined,
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
        _options = await hook(_options, id)
      }
    }

    // Move json data to body as string
    if (_options.json !== undefined) {
      if (_options.body !== undefined) {
        throw defineLylaError<M, LylaBadRequestError>(
          {
            type: LYLA_ERROR.BAD_REQUEST,
            message:
              "`options.json` can't be used together with `options.body`. If you want to use `options.json`, you should left `options.body` as `undefined`",
            detail: undefined,
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

    async function handleResponseError(error: LylaResponseError<M>) {
      if (_options.hooks?.onResponseError) {
        for (const hook of _options.hooks?.onResponseError) {
          await hook(error, id)
        }
      }
    }

    let _resolve: (value: LylaResponse<T, M>) => void
    let _reject: (value: LylaError<M>) => void

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

    const requestPromise = new Promise<LylaResponse<T, M>>(
      (resolve, reject) => {
        _resolve = resolve
        _reject = (e) => {
          cleanup()
          reject(e)
        }
      }
    )

    let aborted = false
    function onAbortSignalReceived() {
      if (aborted) return
      aborted = true
      const error = defineLylaError<M, LylaAbortedError>(
        {
          type: LYLA_ERROR.ABORTED,
          message: 'Request aborted',
          detail: undefined,
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

    let networkError = false
    const adapterHandle = lylaOptions.adapter({
      url,
      method,
      body,
      json: _options.json,
      headers: requestHeaders,
      responseType,
      withCredentials,
      onNetworkError(detail: any) {
        networkError = true
        cleanup()
        const error = defineLylaError<M, LylaNetworkError<M>>(
          {
            type: LYLA_ERROR.NETWORK,
            message: 'Network error',
            detail,
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
      async onResponse(resp, detail) {
        if (aborted) return
        if (networkError) return
        cleanup()
        let _json: any
        let _jsonIsSet = false
        let _cachedJson: any
        let _cachedJsonParsingError: TypeError
        const statusText = getStatusText(resp.status)
        let response: LylaResponse<any, M> = {
          requestOptions: _options,
          status: resp.status,
          statusText,
          headers: mergeHeaders({}, resp.headers),
          body: resp.body,
          detail,
          set json(value: any) {
            _jsonIsSet = true
            _json = value
          },
          get json() {
            if (_jsonIsSet) return _json
            if (responseType !== 'text') {
              const error = defineLylaError<M, LylaInvalidConversionError<M>>(
                {
                  type: LYLA_ERROR.INVALID_CONVERSION,
                  message: `Can not convert ${responseType} to JSON`,
                  detail: undefined,
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
              const error = defineLylaError<M, LylaInvalidJSONError<M>>(
                {
                  type: LYLA_ERROR.INVALID_JSON,
                  message: _cachedJsonParsingError.message,
                  detail: undefined,
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
          const reason = `${resp.status} ${statusText}`
          const error = defineLylaError<M, LylaHttpError<M>>(
            {
              type: LYLA_ERROR.HTTP,
              message: `Request failed with ${reason}`,
              detail: undefined,
              error: undefined,
              response
            },
            stack
          )
          handleResponseError(error)
          _reject(error)
          return
        }

        if (_options.hooks?.onAfterResponse) {
          for (const hook of _options.hooks.onAfterResponse) {
            response = await hook(response, id)
          }
        }

        _resolve(response)
      }
    })

    if (timeout) {
      setTimeout(() => {
        if (settled) return
        adapterHandle.abort()
        aborted = true
        const error = defineLylaError<M, LylaTimeoutError>(
          {
            type: LYLA_ERROR.TIMEOUT,
            message: timeout
              ? `Timeout of ${timeout}ms exceeded`
              : 'Timeout exceeded',
            detail: undefined,
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
      throw defineLylaError<M, LylaBadRequestError>(
        {
          type: LYLA_ERROR.BAD_REQUEST,
          message: "Can not send a request with body in 'GET' method.",
          error: undefined,
          response: undefined,
          detail: undefined
        },
        undefined
      )
    }
    return requestPromise
  }

  function createRequestShortcut(method: LylaRequestOptions['method']) {
    return <T>(
      url: string,
      options?: Omit<LylaRequestOptions<M>, 'url' | 'method'>
    ): Promise<LylaResponse<T, M>> => {
      return request<T>({
        ...options,
        method,
        url
      })
    }
  }

  function extend(options?: LylaRequestOptions<M>): Lyla<M> {
    const extendedOptions = mergeOptions<
      LylaRequestOptions<M> & { adapter: LylaAdapter<M> }
    >(lylaOptions, options)
    return createLyla<M>(extendedOptions).lyla
  }

  return {
    lyla: Object.assign(request, {
      extend,
      get: createRequestShortcut('get'),
      post: createRequestShortcut('post'),
      put: createRequestShortcut('put'),
      patch: createRequestShortcut('patch'),
      head: createRequestShortcut('head'),
      delete: createRequestShortcut('delete'),
      options: createRequestShortcut('options'),
      trace: createRequestShortcut('trace'),
      connect: createRequestShortcut('connect')
    }),
    catchError<T, E = Error>(
      handler: LylaErrorHandler<T, E, M>
    ): (e: any) => T {
      return (e) => {
        if (isLylaError(e)) {
          return handler({ error: undefined, lylaError: e })
        } else {
          return handler({ error: e, lylaError: undefined })
        }
      }
    },
    matchError<T, E = Error>(
      error: any,
      matcher: LylaErrorHandler<T, E, M>
    ): T {
      if (isLylaError(error)) {
        return matcher({ lylaError: error, error: undefined })
      } else {
        return matcher({ lylaError: undefined, error })
      }
    }
  }
}

export { createLyla }
