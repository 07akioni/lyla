import type {
  LylaAdapterMeta,
  LylaRequestOptionsWithContext,
  LylaResponse
} from './types'

export enum LYLA_ERROR {
  /**
   * Request encountered an error, fired by XHR `onerror` event. It doesn't mean
   * your network has error, for example CORS error also triggers NETWORK_ERROR.
   */
  NETWORK = 'NETWORK',
  /**
   * Request is aborted.
   */
  ABORTED = 'ABORTED',
  /**
   * Response text is not valid JSON.
   */
  INVALID_JSON = 'INVALID_JSON',
  /**
   * Trying resolving `response.json` with `responseType='arraybuffer'` or
   * `responseType='blob'`.
   */
  INVALID_CONVERSION = 'INVALID_CONVERSION',
  /**
   * Request timeout.
   */
  TIMEOUT = 'TIMEOUT',
  /**
   * HTTP status error.
   */
  HTTP = 'HTTP',
  /**
   * Request `options` is not valid. It's not a response error.
   */
  BAD_REQUEST = 'BAD_REQUEST',
  /**
   * `onAfterResponse` hook throws error.
   */
  BROKEN_ON_AFTER_RESPONSE = 'BROKEN_ON_AFTER_RESPONSE',
  /**
   * `onBeforeRequest` hook throws error.
   */
  BROKEN_ON_BEFORE_REQUEST = 'BROKEN_ON_BEFORE_REQUEST',
  /**
   * `onInit` hook throws error.
   */
  BROKEN_ON_INIT = 'BROKEN_ON_INIT',
  /**
   * `onResponseError` hook throws error.
   */
  BROKEN_ON_RESPONSE_ERROR = 'BROKEN_ON_RESPONSE_ERROR',
  /**
   * `onNonResponseError` hook throws error.
   */
  BROKEN_ON_NON_RESPONSE_ERROR = 'BROKEN_ON_NON_RESPONSE_ERROR'
}

export interface LylaBrokenOnAfterResponseError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.BROKEN_ON_AFTER_RESPONSE
  error: unknown
  detail: undefined
  response: LylaResponse<any, C, M>
  context: C
  requestOptions: LylaRequestOptionsWithContext<C, M>
  spread: () => Omit<LylaBrokenOnAfterResponseError<C, M>, 'spread'>
}

export interface LylaBrokenOnResponseErrorError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.BROKEN_ON_RESPONSE_ERROR
  error: unknown
  detail: undefined
  response: LylaResponse<any, C, M> | undefined
  context: C
  requestOptions: LylaRequestOptionsWithContext<C, M>
  spread: () => Omit<LylaBrokenOnResponseErrorError<C, M>, 'spread'>
}

export interface LylaBrokenOnNonResponseErrorError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.BROKEN_ON_NON_RESPONSE_ERROR
  error: unknown
  detail: undefined
  response: undefined
  context: C
  requestOptions: LylaRequestOptionsWithContext<C, M>
  spread: () => Omit<LylaBrokenOnNonResponseErrorError<C, M>, 'spread'>
}

export interface LylaBrokenOnBeforeRequestError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.BROKEN_ON_BEFORE_REQUEST
  error: unknown
  detail: undefined
  response: undefined
  context: C
  requestOptions: LylaRequestOptionsWithContext<C, M>
  spread: () => Omit<LylaBrokenOnBeforeRequestError<C, M>, 'spread'>
}

export interface LylaBrokenOnInitError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.BROKEN_ON_INIT
  error: unknown
  detail: undefined
  response: undefined
  context: C
  requestOptions: LylaRequestOptionsWithContext<C, M>
  spread: () => Omit<LylaBrokenOnInitError<C, M>, 'spread'>
}

export interface LylaTimeoutError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.TIMEOUT
  error: undefined
  detail: undefined
  response: undefined
  context: C
  requestOptions: LylaRequestOptionsWithContext<C, M>
  spread: () => Omit<LylaTimeoutError<C, M>, 'spread'>
}

export interface LylaInvalidConversionError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.INVALID_CONVERSION
  error: undefined
  detail: undefined
  response: LylaResponse<any, C, M>
  context: C
  requestOptions: LylaRequestOptionsWithContext<C, M>
  spread: () => Omit<LylaInvalidConversionError<C, M>, 'spread'>
}

export interface LylaHttpError<C, M extends LylaAdapterMeta = LylaAdapterMeta>
  extends Error {
  type: LYLA_ERROR.HTTP
  error: undefined
  detail: undefined
  response: LylaResponse<any, C, M>
  context: C
  requestOptions: LylaRequestOptionsWithContext<C, M>
  spread: () => Omit<LylaHttpError<C, M>, 'spread'>
}

export interface LylaNetworkError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.NETWORK
  error: undefined
  detail: M['networkErrorDetail']
  response: undefined
  context: C
  requestOptions: LylaRequestOptionsWithContext<C, M>
  spread: () => Omit<LylaNetworkError<C, M>, 'spread'>
}

export interface LylaInvalidJSONError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.INVALID_JSON
  error: SyntaxError
  detail: undefined
  response: LylaResponse<any, C, M>
  context: C
  requestOptions: LylaRequestOptionsWithContext<C, M>
  spread: () => Omit<LylaInvalidJSONError<C, M>, 'spread'>
}

export interface LylaAbortedError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.ABORTED
  error: undefined
  detail: undefined
  response: undefined
  context: C
  requestOptions: LylaRequestOptionsWithContext<C, M>
  spread: () => Omit<LylaAbortedError<C, M>, 'spread'>
}

export interface LylaBadRequestError<
  C,
  M extends LylaAdapterMeta = LylaAdapterMeta
> extends Error {
  type: LYLA_ERROR.BAD_REQUEST
  error: undefined
  detail: undefined
  response: undefined
  context: C
  requestOptions: LylaRequestOptionsWithContext<C, M>
  spread: () => Omit<LylaBadRequestError<C, M>, 'spread'>
}

export type LylaDataConversionError<
  C = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> = LylaInvalidJSONError<C, M> | LylaInvalidConversionError<C, M>

export type LylaResponseError<
  C = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> =
  | LylaNetworkError<C, M>
  | LylaHttpError<C, M>
  | LylaAbortedError<C, M>
  | LylaTimeoutError<C, M>

export type LylaNonResponseError<
  C = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> =
  | LylaAbortedError<C, M>
  | LylaTimeoutError<C, M>
  | LylaBadRequestError<C, M>
  | LylaBrokenOnAfterResponseError<C, M>
  | LylaBrokenOnResponseErrorError<C, M>
  | LylaBrokenOnInitError<C, M>
  | LylaBrokenOnBeforeRequestError<C, M>
  | LylaDataConversionError<C, M>

export type LylaError<C = any, M extends LylaAdapterMeta = LylaAdapterMeta> =
  | LylaResponseError<C, M>
  | LylaNonResponseError<C, M>
  | LylaBrokenOnNonResponseErrorError<C, M>

type _LylaError = Error & { __lylaError?: true }

function createLylaError(): _LylaError {
  const lylaError: _LylaError = new Error()
  lylaError.__lylaError = true
  return lylaError
}

export function defineLylaError<
  M extends LylaAdapterMeta,
  C,
  T extends LylaError<C, M>
>(lylaErrorProps: Omit<T, 'name'>, stack: string | undefined): T {
  const lylaError = createLylaError()
  lylaError.name = `LylaError[${lylaErrorProps.type}]`
  if (stack) {
    lylaError.stack += stack
  }
  Object.assign(lylaError, lylaErrorProps)
  const spread: LylaError<C, M>['spread'] = () => {
    const currentLylaError = lylaError as LylaError<C, M>
    return {
      // Error props
      name: currentLylaError.name,
      message: currentLylaError.message,
      stack: currentLylaError.stack,
      // Other props
      type: currentLylaError.type,
      error: currentLylaError.error,
      detail: currentLylaError.detail,
      context: currentLylaError.context,
      response: currentLylaError.response,
      requestOptions: currentLylaError.requestOptions,
      // special prop
      __lylaError: true
    } satisfies Omit<LylaError<C, M>, 'spread'> & { __lylaError: true } as any
  }
  ;(lylaError as LylaError<C, M>).spread = spread
  return lylaError as any
}

export function isLylaError(error: unknown): error is LylaError<any, any> {
  return typeof error === 'object' && !!error && '__lylaError' in error
}
