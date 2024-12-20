import {
  defineLylaError,
  isLylaError as _isLylaError,
  LylaBadRequestError,
  LylaResponseError,
  LYLA_ERROR,
  LylaBrokenOnAfterResponseError,
  LylaBrokenOnResponseErrorError,
  LylaBrokenOnInitError,
  LylaBrokenOnBeforeRequestError
} from './error'
import { mergeUrl, mergeHeaders, mergeOptions } from './utils'
import type {
  LylaAbortedError,
  LylaBrokenOnHeadersReceivedError,
  LylaBrokenOnNonResponseErrorError,
  LylaError,
  LylaHttpError,
  LylaInvalidConversionError,
  LylaInvalidJSONError,
  LylaNetworkError,
  LylaNonResponseError,
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

type URLSearchParamsLike = {
  toString: () => string
  append: (key: string, value: string) => void
}

// It exists both in node, browser, miniprogram environment
declare const URLSearchParams: {
  new (params: Record<string, string>): URLSearchParamsLike
  new (): URLSearchParamsLike
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
      {},
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
    async function handleNonResponseError(error: LylaNonResponseError<C, M>) {
      if (_options.hooks?.onNonResponseError) {
        try {
          for (const hook of _options.hooks?.onNonResponseError) {
            const maybePromise = hook(error)
            if (maybePromise instanceof Promise) {
              await maybePromise
            }
          }
          _reject(error)
        } catch (e) {
          _reject(
            defineLylaError<M, C, LylaBrokenOnNonResponseErrorError<C, M>>(
              {
                type: LYLA_ERROR.BROKEN_ON_NON_RESPONSE_ERROR,
                error: e,
                message: '`onNonResponseError` hook throws error',
                detail: undefined,
                response: undefined,
                context: error.context,
                requestOptions: _options
              },
              undefined
            )
          )
          return
        }
      } else {
        _reject(error)
      }
    }
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
      const brokenOnInitError = defineLylaError<
        M,
        C,
        LylaBrokenOnInitError<C, M>
      >(
        {
          type: LYLA_ERROR.BROKEN_ON_INIT,
          message: '`onInit` hook throws error',
          detail: undefined,
          error: e,
          response: undefined,
          context: optionsWithContext.context,
          requestOptions: optionsWithContext
        },
        undefined
      )
      handleNonResponseError(brokenOnInitError)
      throw brokenOnInitError
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
      const urlSearchParams = new URLSearchParams()
      for (const [key, value] of Object.entries(_options.query)) {
        if (Array.isArray(value)) {
          for (const v of value) {
            urlSearchParams.append(key, v.toString())
          }
        } else if (value !== undefined && value !== null) {
          urlSearchParams.append(key, value.toString())
        }
      }

      const queryString = urlSearchParams.toString()
      if (_options.url.includes('?')) {
        const badRequestError = defineLylaError<
          M,
          C,
          LylaBadRequestError<C, M>
        >(
          {
            type: LYLA_ERROR.BAD_REQUEST,
            message:
              "`options.query` can't be set if `options.url` contains '?'",
            detail: undefined,
            error: undefined,
            response: undefined,
            context: _options.context,
            requestOptions: _options
          },
          undefined
        )
        handleNonResponseError(badRequestError)
        throw badRequestError
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
        const brokenOnBeforeRequestError = defineLylaError<
          M,
          C,
          LylaBrokenOnBeforeRequestError<C, M>
        >(
          {
            type: LYLA_ERROR.BROKEN_ON_BEFORE_REQUEST,
            message: '`onBeforeRequest` hook throws error',
            detail: undefined,
            error: e,
            response: undefined,
            context: optionsWithContext.context,
            requestOptions: _options
          },
          undefined
        )
        handleNonResponseError(brokenOnBeforeRequestError)
        throw brokenOnBeforeRequestError
      }
    }

    // Move json data to body as string
    if (_options.json !== undefined) {
      if (_options.body !== undefined) {
        const badRequestError = defineLylaError<
          M,
          C,
          LylaBadRequestError<C, M>
        >(
          {
            type: LYLA_ERROR.BAD_REQUEST,
            message:
              "`options.json` can't be used together with `options.body`. If you want to use `options.json`, you should left `options.body` as `undefined`",
            detail: undefined,
            error: undefined,
            response: undefined,
            context: _options.context,
            requestOptions: _options
          },
          undefined
        )
        handleNonResponseError(badRequestError)
        throw badRequestError
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

    async function handleResponseError(error: LylaResponseError<C, M>) {
      if (_options.hooks?.onResponseError) {
        try {
          for (const hook of _options.hooks?.onResponseError) {
            const maybePromise = hook(error, _customReject)
            if (maybePromise instanceof Promise) {
              await maybePromise
            }
          }
          _reject(error)
        } catch (e) {
          const brokenOnResponseErrorError = defineLylaError<
            M,
            C,
            LylaBrokenOnResponseErrorError<C, M>
          >(
            {
              type: LYLA_ERROR.BROKEN_ON_RESPONSE_ERROR,
              error: e,
              message: '`onResponseError` hook throws error',
              detail: undefined,
              response: undefined,
              context: error.context,
              requestOptions: _options
            },
            undefined
          )
          handleNonResponseError(brokenOnResponseErrorError)
          return
        }
      } else {
        _reject(error)
      }
    }

    let _resolve: (value: LylaResponse<T, C, M>) => void
    let _reject: (reason: LylaError<C, M>) => void
    let _customReject: (reason: unknown) => void

    // make request headers
    const requestHeaders: Record<string, string> = {}
    mergeHeaders(requestHeaders, mergedLylaOptions.headers)
    mergeHeaders(requestHeaders, _options.headers)
    // Set 'content-type' header
    if (_options.json !== undefined) {
      requestHeaders['content-type'] =
        requestHeaders['content-type'] ?? 'application/json'
    }
    requestHeaders['accept'] = requestHeaders.accept ?? '*/*'
    _options.headers = requestHeaders

    let settled = false
    let abortSignalListenerOff = false
    function cleanup() {
      settled = true
      if (!abortSignalListenerOff) {
        stopListeningAbortSignal()
      }
    }
    function stopListeningAbortSignal() {
      abortSignalListenerOff = true
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
      const abortError = defineLylaError<M, C, LylaAbortedError<C, M>>(
        {
          type: LYLA_ERROR.ABORTED,
          message: 'Request aborted',
          detail: undefined,
          error: undefined,
          response: undefined,
          context: _options.context,
          requestOptions: _options
        },
        stack
      )
      const settled = () => adapterHandle.abort()
      handleResponseError(abortError).then(settled).catch(settled)
    }

    if (signal) {
      signal.addEventListener('abort', onAbortSignalReceived)
    }

    let hasNetworkError = false
    const onHeadersReceived = _options.hooks?.onHeadersReceived
    const adapterHandle = adapter({
      url,
      method,
      body,
      json: _options.json,
      headers: requestHeaders,
      responseType,
      withCredentials,
      extraOptions: _options.extraOptions,
      onNetworkError(detail: any) {
        hasNetworkError = true
        stopListeningAbortSignal()
        const networkError = defineLylaError<M, C, LylaNetworkError<C, M>>(
          {
            type: LYLA_ERROR.NETWORK,
            message: 'Network error',
            detail,
            error: undefined,
            response: undefined,
            context: _options.context,
            requestOptions: _options
          },
          stack
        )
        handleResponseError(networkError)
      },
      onDownloadProgress: onDownloadProgress
        ? (progress) => {
            onDownloadProgress({ ...progress, requestOptions: _options })
          }
        : undefined,
      onUploadProgress: onUploadProgress
        ? (progress) => {
            onUploadProgress({ ...progress, requestOptions: _options })
          }
        : undefined,
      onHeadersReceived: onHeadersReceived
        ? (_headers, originalRequest) => {
            if (aborted) return
            if (hasNetworkError) return
            if (onHeadersReceived) {
              const headers = mergeHeaders({}, _headers)
              try {
                for (const hook of onHeadersReceived) {
                  hook(
                    { headers, requestOptions: _options, originalRequest },
                    _customReject
                  )
                }
              } catch (error) {
                const brokenOnHeadersReceived = defineLylaError<
                  M,
                  C,
                  LylaBrokenOnHeadersReceivedError<C, M>
                >(
                  {
                    type: LYLA_ERROR.BROKEN_ON_HEADERS_RECEIVED,
                    message: '`onHeadersReceived` hook throws error',
                    detail: undefined,
                    response: undefined,
                    error,
                    context: _options.context,
                    requestOptions: _options
                  },
                  undefined
                )
                handleNonResponseError(brokenOnHeadersReceived)
                return
              }
            }
          }
        : undefined,
      async onResponse(resp, detail) {
        if (aborted) return
        if (hasNetworkError) return
        stopListeningAbortSignal()
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
              const dataConversionError = defineLylaError<
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
                  context: response.context,
                  requestOptions: _options
                },
                undefined
              )
              handleNonResponseError(dataConversionError)
              throw dataConversionError
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
              const dataConversionError = defineLylaError<
                M,
                C,
                LylaInvalidJSONError<C, M>
              >(
                {
                  type: LYLA_ERROR.INVALID_JSON,
                  message: _cachedJsonParsingError.message,
                  detail: undefined,
                  error: _cachedJsonParsingError,
                  context: response.context,
                  response,
                  requestOptions: _options
                },
                undefined
              )
              handleNonResponseError(dataConversionError)
              throw dataConversionError
            }
          }
        }

        if (!isOkStatus(resp.status)) {
          const reason = `${resp.status} ${statusText}`
          const httpError = defineLylaError<M, C, LylaHttpError<C, M>>(
            {
              type: LYLA_ERROR.HTTP,
              message: `Request failed with ${reason}`,
              detail: undefined,
              error: undefined,
              response,
              context: _options.context,
              requestOptions: _options
            },
            stack
          )
          handleResponseError(httpError)
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
            const brokenOnAfterResponseErrorError = defineLylaError<
              M,
              C,
              LylaBrokenOnAfterResponseError<C, M>
            >(
              {
                type: LYLA_ERROR.BROKEN_ON_AFTER_RESPONSE,
                message: '`onAfterResponse` hook throws error',
                detail: undefined,
                response,
                error,
                context: response.context,
                requestOptions: _options
              },
              undefined
            )
            handleNonResponseError(brokenOnAfterResponseErrorError)
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
        const timeoutError = defineLylaError<M, C, LylaTimeoutError<C, M>>(
          {
            type: LYLA_ERROR.TIMEOUT,
            message: timeout
              ? `Timeout of ${timeout}ms exceeded`
              : 'Timeout exceeded',
            detail: undefined,
            error: undefined,
            response: undefined,
            context: _options.context,
            requestOptions: _options
          },
          stack
        )
        handleResponseError(timeoutError)
      }, timeout)
    }
    if (!_options.allowGetBody && method === 'GET' && body) {
      const badRequestError = defineLylaError<M, C, LylaBadRequestError<C, M>>(
        {
          type: LYLA_ERROR.BAD_REQUEST,
          message: "Can not send a request with body in 'GET' method.",
          error: undefined,
          response: undefined,
          detail: undefined,
          context: _options.context,
          requestOptions: _options
        },
        undefined
      )
      handleNonResponseError(badRequestError)
      throw badRequestError
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
      connect: createRequestShortcut('connect'),
      get errorType() {
        return {} as LylaError<C, M>
      }
    }),
    isLylaError(e: unknown): e is LylaError<C, M> {
      return _isLylaError(e)
    }
  }
}
