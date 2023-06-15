import {
  defineLylaError,
  isLylaError as _isLylaError,
  LylaBadRequestError,
  LylaResponseError,
  LYLA_ERROR,
  LylaBrokenOnAfterResponseError,
  LylaBrokenOnResponseErrorError,
  LylaBrokenOnInitError,
  LylaBrokenOnBeforeRequestError,
  LylaDataConversionError,
  LylaBrokenOnDataConversionErrorError
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
  LylaAdapterMeta,
  LylaRequestOptionsWithContext
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

export function createLyla<C, M extends LylaAdapterMeta>(
  adapter: LylaAdapter<M>,
  lylaOptions: LylaRequestOptionsWithContext<C, M>,
  ...overrides: LylaRequestOptions<C, M>[]
): {
  isLylaError(e: unknown): e is LylaError<C, M>
  lyla: Lyla<C, M>
} {
  const mergedLylaOptions = mergeOptions<LylaRequestOptionsWithContext<C, M>>(
    lylaOptions,
    ...overrides
  )
  async function request<T = any>(
    options: LylaRequestOptions<C, M>
  ): Promise<LylaResponse<T, C, M>> {
    const resolvedContext =
      options.context === undefined
        ? mergedLylaOptions.context
        : options.context
    let optionsWithContext: LylaRequestOptionsWithContext<C, M> = Object.assign(
      options,
      {
        context:
          typeof resolvedContext === 'object'
            ? (JSON.parse(
                JSON.stringify(resolvedContext)
              ) as typeof resolvedContext)
            : resolvedContext
      }
    )
    try {
      if (mergedLylaOptions?.hooks?.onInit) {
        for (const hook of mergedLylaOptions.hooks.onInit) {
          const maybeOptionsWithContextPromise = hook(optionsWithContext)
          if (maybeOptionsWithContextPromise instanceof Promise) {
            optionsWithContext = await maybeOptionsWithContextPromise
          } else {
            optionsWithContext = maybeOptionsWithContextPromise
          }
        }
      }
      if (options?.hooks?.onInit) {
        for (const hook of options.hooks.onInit) {
          const maybeOptionsWithContextPromise = hook(optionsWithContext)
          if (maybeOptionsWithContextPromise instanceof Promise) {
            optionsWithContext = await maybeOptionsWithContextPromise
          } else {
            optionsWithContext = maybeOptionsWithContextPromise
          }
        }
      }
    } catch (e) {
      throw defineLylaError<M, C, LylaBrokenOnInitError<C>>(
        {
          type: LYLA_ERROR.BROKEN_ON_INIT,
          message: '`onInit` hook throws error',
          detail: undefined,
          error: undefined,
          response: undefined,
          context: optionsWithContext.context
        },
        undefined
      )
    }

    let _options: LylaRequestOptionsWithContext<C, M> = mergeOptions(
      mergedLylaOptions,
      optionsWithContext
    )

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
        throw defineLylaError<M, C, LylaBadRequestError<C>>(
          {
            type: LYLA_ERROR.BAD_REQUEST,
            message:
              "`options.query` can't be set if `options.url` contains '?'",
            detail: undefined,
            error: undefined,
            response: undefined,
            context: _options.context
          },
          undefined
        )
      }
      if (queryString.length) {
        _options.url = _options.url + '?' + queryString
      }
    }

    if (_options.hooks?.onBeforeRequest) {
      try {
        for (const hook of _options.hooks?.onBeforeRequest) {
          const maybeOptionsPromise = hook(_options)
          if (maybeOptionsPromise instanceof Promise) {
            _options = await maybeOptionsPromise
          } else {
            _options = maybeOptionsPromise
          }
        }
      } catch (e) {
        throw defineLylaError<M, C, LylaBrokenOnBeforeRequestError<C>>(
          {
            type: LYLA_ERROR.BROKEN_ON_BEFORE_REQUEST,
            message: '`onBeforeRequest` hook throws error',
            detail: undefined,
            error: undefined,
            response: undefined,
            context: optionsWithContext.context
          },
          undefined
        )
      }
    }

    // Move json data to body as string
    if (_options.json !== undefined) {
      if (_options.body !== undefined) {
        throw defineLylaError<M, C, LylaBadRequestError<C>>(
          {
            type: LYLA_ERROR.BAD_REQUEST,
            message:
              "`options.json` can't be used together with `options.body`. If you want to use `options.json`, you should left `options.body` as `undefined`",
            detail: undefined,
            error: undefined,
            response: undefined,
            context: _options.context
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

    async function handleDataConversionError(
      error: LylaDataConversionError<C, M>,
      context: C,
      response: LylaResponse<any, C, M>
    ) {
      if (_options.hooks?.onDataConversionError) {
        try {
          for (const hook of _options.hooks?.onDataConversionError) {
            const maybePromise = hook(error)
            if (maybePromise instanceof Promise) {
              await maybePromise
            }
          }
        } catch (e) {
          _reject(
            defineLylaError<M, C, LylaBrokenOnDataConversionErrorError<C, M>>(
              {
                type: LYLA_ERROR.BROKEN_ON_DATA_CONVERSION_ERROR,
                error: e,
                message: '`onDataConversionError` hook throws error',
                detail: undefined,
                response,
                context
              },
              undefined
            )
          )
          return
        }
      }
    }

    async function handleResponseError(
      error: LylaResponseError<C, M>,
      context: C
    ) {
      if (_options.hooks?.onResponseError) {
        try {
          for (const hook of _options.hooks?.onResponseError) {
            const maybePromise = hook(error, _customReject)
            if (maybePromise instanceof Promise) {
              await maybePromise
            }
          }
        } catch (e) {
          _reject(
            defineLylaError<M, C, LylaBrokenOnResponseErrorError<C, M>>(
              {
                type: LYLA_ERROR.BROKEN_ON_RESPONSE_ERROR,
                error: e,
                message: '`onResponseError` hook throws error',
                detail: undefined,
                response: undefined,
                context
              },
              undefined
            )
          )
          return
        }
      }
    }

    let _resolve: (value: LylaResponse<T, C, M>) => void
    let _reject: (reason: LylaError<C, M>) => void
    let _customReject: (reason: unknown) => void

    // make request headers
    const requestHeaders: Record<string, string> = {}
    mergeHeaders(requestHeaders, mergedLylaOptions.headers)
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

    const requestPromise = new Promise<LylaResponse<T, C, M>>(
      (resolve, reject) => {
        _resolve = resolve
        _reject = (reason) => {
          if (settled) return
          cleanup()
          reject(reason)
        }
        _customReject = (reason) => {
          if (settled) return
          cleanup()
          reject(reason)
        }
      }
    )

    let aborted = false
    function onAbortSignalReceived() {
      if (aborted) return
      aborted = true
      const error = defineLylaError<M, C, LylaAbortedError<C>>(
        {
          type: LYLA_ERROR.ABORTED,
          message: 'Request aborted',
          detail: undefined,
          error: undefined,
          response: undefined,
          context: _options.context
        },
        stack
      )
      handleResponseError(error, _options.context)
      _reject(error)
      adapterHandle.abort()
    }

    if (signal) {
      signal.addEventListener('abort', onAbortSignalReceived)
    }

    let networkError = false
    const adapterHandle = adapter({
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
        const error = defineLylaError<M, C, LylaNetworkError<C, M>>(
          {
            type: LYLA_ERROR.NETWORK,
            message: 'Network error',
            detail,
            error: undefined,
            response: undefined,
            context: _options.context
          },
          stack
        )
        handleResponseError(error, _options.context)
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
        let response: LylaResponse<any, C, M> = {
          context: _options.context,
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
              const error = defineLylaError<
                M,
                C,
                LylaInvalidConversionError<C, M>
              >(
                {
                  type: LYLA_ERROR.INVALID_CONVERSION,
                  message: `Can not convert ${responseType} to JSON`,
                  detail: undefined,
                  error: undefined,
                  response,
                  context: response.context
                },
                undefined
              )
              handleDataConversionError(error, response.context, response)
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
              const error = defineLylaError<M, C, LylaInvalidJSONError<C, M>>(
                {
                  type: LYLA_ERROR.INVALID_JSON,
                  message: _cachedJsonParsingError.message,
                  detail: undefined,
                  error: _cachedJsonParsingError,
                  context: response.context,
                  response
                },
                undefined
              )
              handleDataConversionError(error, response.context, response)
              throw error
            }
          }
        }

        if (!isOkStatus(resp.status)) {
          const reason = `${resp.status} ${statusText}`
          const error = defineLylaError<M, C, LylaHttpError<C, M>>(
            {
              type: LYLA_ERROR.HTTP,
              message: `Request failed with ${reason}`,
              detail: undefined,
              error: undefined,
              response,
              context: _options.context
            },
            stack
          )
          handleResponseError(error, _options.context)
          _reject(error)
          return
        }

        if (_options.hooks?.onAfterResponse) {
          try {
            for (const hook of _options.hooks.onAfterResponse) {
              const maybeResponsePromise = hook(response, _customReject)
              if (maybeResponsePromise instanceof Promise) {
                response = await maybeResponsePromise
              } else {
                response = maybeResponsePromise
              }
            }
          } catch (error) {
            _reject(
              defineLylaError<M, C, LylaBrokenOnAfterResponseError<C, M>>(
                {
                  type: LYLA_ERROR.BROKEN_ON_AFTER_RESPONSE,
                  message: '`onAfterResponse` hook throws error',
                  detail: undefined,
                  response,
                  error,
                  context: response.context
                },
                undefined
              )
            )
            return
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
        const error = defineLylaError<M, C, LylaTimeoutError<C>>(
          {
            type: LYLA_ERROR.TIMEOUT,
            message: timeout
              ? `Timeout of ${timeout}ms exceeded`
              : 'Timeout exceeded',
            detail: undefined,
            error: undefined,
            response: undefined,
            context: _options.context
          },
          stack
        )
        handleResponseError(error, _options.context)
        _reject(error)
      }, timeout)
    }
    if (method === 'GET' && body) {
      throw defineLylaError<M, C, LylaBadRequestError<C>>(
        {
          type: LYLA_ERROR.BAD_REQUEST,
          message: "Can not send a request with body in 'GET' method.",
          error: undefined,
          response: undefined,
          detail: undefined,
          context: _options.context
        },
        undefined
      )
    }
    return requestPromise
  }

  function createRequestShortcut(method: LylaRequestOptions['method']) {
    return <T>(
      url: string,
      options?: Omit<LylaRequestOptions<C, M>, 'url' | 'method'>
    ): Promise<LylaResponse<T, C, M>> => {
      return request<T>({
        ...options,
        method,
        url
      })
    }
  }

  return {
    lyla: Object.assign(request, {
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
    isLylaError(e: unknown): e is LylaError<C, M> {
      return _isLylaError(e)
    }
  }
}
