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
  isLylaErrorWithRetry
} from './error'
import { mergeUrl, mergeHeaders, mergeOptions } from './utils'
import type {
  LylaAbortedError,
  LylaBrokenOnHeadersReceivedError,
  LylaBrokenOnNonResponseErrorError,
  LylaBrokenRetryError,
  LylaError,
  LylaErrorWithRetry,
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
  LylaAdapterOptions,
  LylaRequestOptionsWithContext,
  LylaNormalizedRequestOptions,
  LylaContextFactory,
  LylaCreateOptions,
  LylaRetryOnRejectedCommand,
  LylaRetryOnResolvedCommand,
  LylaWithRetry,
  LylaWithRetryOptions
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
  new(params: Record<string, string>): URLSearchParamsLike
  new(): URLSearchParamsLike
}

function normalizeOptions<C, M extends LylaAdapterMeta>(
  options: LylaRequestOptionsWithContext<C, M>
): LylaNormalizedRequestOptions<C, M> {
  return Object.assign(options, {
    url: options.url || '',
    method: (options.method
      ? options.method.toUpperCase()
      : 'GET') as LylaNormalizedRequestOptions<C, M>['method'],
    responseType: options.responseType || ('text' as M['responseType'])
  })
}

export function createLyla<C, M extends LylaAdapterMeta>(
  adapter: LylaAdapter<M>,
  lylaOptions: LylaCreateOptions<C, M> & {
    // createContext is required
    createContext: LylaContextFactory<C>
  },
  ...overrides: LylaCreateOptions<C, M>[]
): {
  isLylaError(e: unknown): e is LylaError<C, M>
  isLylaErrorWithRetry(e: unknown): e is LylaErrorWithRetry<C, M>
  lyla: Lyla<C, M>
} {
  const { createContext: _, ...mergedLylaOptions } = mergeOptions<
    LylaCreateOptions<C, M>
  >(lylaOptions, ...overrides)
  const contextFactories: LylaContextFactory<C>[] = []
  for (const { createContext } of [lylaOptions, ...overrides]) {
    if (createContext) contextFactories.push(createContext)
  }
  function resolveContext(factories: LylaContextFactory<C>[]): C {
    let parent: { context: C } | null = null
    for (const factory of factories) {
      parent = { context: factory(parent) }
    }
    return parent!.context
  }
  async function request<T = any>(
    options: LylaRequestOptions<C, M>,
    onContextReady?: (c: C) => void
  ): Promise<LylaResponse<T, C, M>> {
    if (options.context !== undefined && options.createContext) {
      const requestOptions = Object.assign({}, options, {
        context: options.context
      })
      const badRequestError = defineLylaError<
        M,
        C,
        LylaBadRequestError<C, M>
      >(
        {
          type: LYLA_ERROR.BAD_REQUEST,
          message:
            "`options.context` can't be used together with `options.createContext`",
          detail: undefined,
          error: undefined,
          response: undefined,
          context: options.context,
          requestOptions
        },
        undefined
      )
      throw await callNonResponseErrorHooks(
        badRequestError,
        mergeOptions<LylaRequestOptionsWithContext<C, M>>(
          mergedLylaOptions,
          requestOptions
        )
      )
    }
    let context: C
    try {
      context =
        options.context === undefined
          ? resolveContext(
            options.createContext
              ? [...contextFactories, options.createContext]
              : contextFactories
          )
          : options.context
    } catch (e) {
      const requestOptions = Object.assign({}, options)
      const badRequestError = defineLylaError<
        M,
        C,
        LylaBadRequestError<C, M>
      >(
        {
          type: LYLA_ERROR.BAD_REQUEST,
          message:
            '`createContext` throws error. See `error` for the original error',
          detail: undefined,
          error: e,
          response: undefined,
          context: undefined,
          requestOptions
        },
        undefined
      )
      throw await callNonResponseErrorHooks(
        badRequestError,
        mergeOptions<LylaRequestOptions<C, M>>(
          mergedLylaOptions,
          requestOptions
        )
      )
    }
    let optionsWithContext: LylaRequestOptionsWithContext<C, M> = Object.assign(
      {},
      options,
      { context }
    )
    onContextReady?.(context)
    async function callNonResponseErrorHooks(
      error: LylaNonResponseError<C, M>,
      requestOptions: LylaRequestOptions<C, M>
    ): Promise<LylaError<C, M>> {
      if (requestOptions.hooks?.onNonResponseError) {
        try {
          for (const hook of requestOptions.hooks.onNonResponseError) {
            const maybePromise = hook(error)
            if (maybePromise instanceof Promise) {
              await maybePromise
            }
          }
        } catch (e) {
          return defineLylaError<
            M,
            C,
            LylaBrokenOnNonResponseErrorError<C, M>
          >(
            {
              type: LYLA_ERROR.BROKEN_ON_NON_RESPONSE_ERROR,
              error: e,
              message: '`onNonResponseError` hook throws error',
              detail: undefined,
              response: undefined,
              context: error.context,
              requestOptions
            },
            undefined
          )
        }
      }
      return error
    }
    async function handleNonResponseError(
      error: LylaNonResponseError<C, M>,
      shouldRejectOriginalRequest: boolean
    ) {
      const rejection = await callNonResponseErrorHooks(error, _options)
      if (shouldRejectOriginalRequest || rejection !== error) {
        _reject(rejection)
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
      throw await callNonResponseErrorHooks(
        brokenOnInitError,
        mergeOptions<LylaRequestOptionsWithContext<C, M>>(
          mergedLylaOptions,
          optionsWithContext
        )
      )
    }

    let _options = normalizeOptions(
      mergeOptions<LylaRequestOptionsWithContext<C, M>>(
        mergedLylaOptions,
        optionsWithContext
      )
    )

    if (_options.baseUrl) {
      _options.url = mergeUrl(_options.baseUrl, _options.url)
    }

    let stack: string | undefined
    try {
      stack = new Error().stack?.replace(/^Error/, '')
    } catch (_) { }

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
        throw await callNonResponseErrorHooks(badRequestError, _options)
      }
      if (queryString.length) {
        _options.url = _options.url + '?' + queryString
      }
    }

    if (_options.hooks?.onBeforeRequest) {
      try {
        for (const hook of _options.hooks?.onBeforeRequest) {
          const maybeOptionsPromise = hook(_options)
          _options = normalizeOptions(
            maybeOptionsPromise instanceof Promise
              ? await maybeOptionsPromise
              : maybeOptionsPromise
          )
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
        throw await callNonResponseErrorHooks(
          brokenOnBeforeRequestError,
          _options
        )
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
        throw await callNonResponseErrorHooks(badRequestError, _options)
      }
      try {
        _options.body = JSON.stringify(_options.json)
      } catch (e) {
        const badRequestError = defineLylaError<
          M,
          C,
          LylaBadRequestError<C, M>
        >(
          {
            type: LYLA_ERROR.BAD_REQUEST,
            message: "`options.json` can't be serialized to JSON",
            detail: undefined,
            error: e,
            response: undefined,
            context: _options.context,
            requestOptions: _options
          },
          undefined
        )
        throw await callNonResponseErrorHooks(badRequestError, _options)
      }
    }

    if (
      !_options.allowGetBody &&
      _options.method === 'GET' &&
      _options.body
    ) {
      const badRequestError = defineLylaError<
        M,
        C,
        LylaBadRequestError<C, M>
      >(
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
      throw await callNonResponseErrorHooks(badRequestError, _options)
    }

    const {
      timeout,
      url,
      method,
      body,
      responseType,
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
          handleNonResponseError(brokenOnResponseErrorError, true)
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

    let adapterHandle: ReturnType<LylaAdapter<M>> | undefined
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
      const settled = () => adapterHandle?.abort()
      handleResponseError(abortError).then(settled).catch(settled)
    }

    if (signal) {
      if (signal.aborted) {
        onAbortSignalReceived()
        return requestPromise
      }
      signal.addEventListener('abort', onAbortSignalReceived)
    }

    let hasNetworkError = false
    let hasBrokenOnHeadersReceived = false
    const onHeadersReceived = _options.hooks?.onHeadersReceived
    const adapterOptions: LylaAdapterOptions<M> = {
      url,
      method,
      body,
      json: _options.json,
      headers: requestHeaders,
      responseType,
      withCredentials,
      extraOptions: _options.extraOptions,
      onNetworkError(detail: any) {
        if (aborted) return
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
              hasBrokenOnHeadersReceived = true
              handleNonResponseError(brokenOnHeadersReceived, true)
              return
            }
          }
        }
        : undefined,
      async onResponse(resp, detail) {
        if (aborted) return
        if (hasNetworkError) return
        // The response may arrive before `onNonResponseError` hooks finish
        if (hasBrokenOnHeadersReceived) return
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
              handleNonResponseError(dataConversionError, false)
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
              handleNonResponseError(dataConversionError, false)
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
            handleNonResponseError(brokenOnAfterResponseErrorError, true)
            return
          }
        }
        cleanup()
        _resolve(response)
      }
    }

    try {
      adapterHandle = adapter(adapterOptions)
    } catch (e) {
      stopListeningAbortSignal()
      const badRequestError = defineLylaError<
        M,
        C,
        LylaBadRequestError<C, M>
      >(
        {
          type: LYLA_ERROR.BAD_REQUEST,
          message:
            'Adapter throws error when sending the request, `options.url` or `options.headers` may be invalid. See `error` for the original error',
          detail: undefined,
          error: e,
          response: undefined,
          context: _options.context,
          requestOptions: _options
        },
        stack
      )
      handleNonResponseError(badRequestError, true)
      return requestPromise
    }

    if (timeout) {
      setTimeout(() => {
        if (settled) return
        aborted = true
        // XHR's abort will call onResponse in loadend event, so we need to mark aborted before calling abort()
        adapterHandle!.abort()
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

  const lyla: Lyla<C, M> = Object.assign(request, {
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
    },
    withRetry: null as any
  })

  const withRetry: LylaWithRetry<C, M> = <S>({
    onResolved,
    onRejected,
    onBrokenRetry,
    createState
  }: LylaWithRetryOptions<C, M, S>) => {
    async function requestWithRetry<T = any>(
      options: LylaRequestOptions<C, M>
    ): Promise<LylaResponse<T, C, M>> {
      // Errors thrown by `onBrokenRetry` are thrown as is
      let state: S | undefined = undefined

      let retryOptionsResolver:
        | (() => Promise<LylaRequestOptions<C, M>> | LylaRequestOptions<C, M>)
        | undefined = undefined

      const handleBrokenRetry = async (
        error: unknown,
        context: C | undefined,
        requestOptions: LylaRequestOptions<C, M>
      ): Promise<LylaRetryOnRejectedCommand<C, M>> => {
        const brokenRetryError = defineLylaError<
          M,
          C,
          LylaBrokenRetryError<C, M>
        >(
          {
            type: LYLA_ERROR.BROKEN_RETRY,
            error,
            message: 'Retry process throws an unexpected error',
            detail: undefined,
            response: undefined,
            context,
            isRetryError: true,
            requestOptions: options
          },
          undefined
        )
        return onBrokenRetry({
          error: brokenRetryError,
          context,
          lyla,
          state,
          options: requestOptions
        })
      }

      while (true) {
        try {
          state = createState()
          break
        } catch (e) {
          const command = await handleBrokenRetry(e, undefined, options)
          if (command.action === 'reject') throw command.value
          retryOptionsResolver = command.value
        }
      }

      while (true) {
        let response: LylaResponse<any, C, M>
        let finalOptions: LylaRequestOptions<C, M>

        try {
          finalOptions = retryOptionsResolver
            ? await retryOptionsResolver()
            : options
        } catch (e) {
          const command = await handleBrokenRetry(e, undefined, options)
          if (command.action === 'reject') throw command.value
          retryOptionsResolver = command.value
          continue
        }

        let context: C | undefined = undefined
        try {
          response = await request(finalOptions, (v) => (context = v))
        } catch (e) {
          let rejected: LylaRetryOnRejectedCommand<C, M>
          try {
            rejected = await onRejected({
              options: finalOptions,
              context,
              state,
              lyla,
              // The error can be a lyla error, or a custom error thrown by user
              // in lyla hooks.
              error: e
            })
          } catch (e) {
            rejected = await handleBrokenRetry(e, context, finalOptions)
          }
          if (rejected.action === 'reject') throw rejected.value
          retryOptionsResolver = rejected.value
          continue
        }

        let resolved: LylaRetryOnResolvedCommand<any, C, M>
        try {
          resolved = await onResolved({
            options: finalOptions,
            context: context!,
            response,
            state
          })
        } catch (e) {
          resolved = await handleBrokenRetry(e, context, finalOptions)
        }

        switch (resolved.action) {
          case 'resolve':
            return resolved.value
          case 'reject':
            throw resolved.value
          case 'retry':
            retryOptionsResolver = resolved.value
            continue
        }
      }
    }

    function createRequestWithRetryShortcut(
      method: LylaRequestOptions['method']
    ) {
      return <T>(
        url: string,
        options?: Omit<LylaRequestOptions<C, M>, 'url' | 'method'>
      ): Promise<LylaResponse<T, C, M>> => {
        return requestWithRetry<T>({
          ...options,
          method,
          url
        })
      }
    }
    return Object.assign(requestWithRetry, {
      get: createRequestWithRetryShortcut('get'),
      post: createRequestWithRetryShortcut('post'),
      put: createRequestWithRetryShortcut('put'),
      patch: createRequestWithRetryShortcut('patch'),
      head: createRequestWithRetryShortcut('head'),
      delete: createRequestWithRetryShortcut('delete'),
      options: createRequestWithRetryShortcut('options'),
      trace: createRequestWithRetryShortcut('trace'),
      connect: createRequestWithRetryShortcut('connect'),
      get errorType() {
        return {} as LylaError<C, M>
      },
      withRetry() {
        throw new Error(
          "Can't call `withRetry` on a lyla instance with created by `withRetry`"
        )
      }
    })
  }

  lyla.withRetry = withRetry

  return {
    lyla,
    isLylaError(e: unknown): e is LylaError<C, M> {
      return _isLylaError(e)
    },
    isLylaErrorWithRetry(e: unknown): e is LylaErrorWithRetry<C, M> {
      return isLylaErrorWithRetry(e)
    }
  }
}
