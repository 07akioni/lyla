import type {
  LylaError,
  LylaNonResponseError,
  LylaResponseError
} from './error'

export type LylaMethod =
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
  | 'TRACE'
  | 'trace'
  | 'CONNECT'
  | 'connect'

export type AbortSignal = {
  addEventListener(ev: 'abort', callback: () => void): void
  removeEventListener(ev: 'abort', callback: () => void): void
}

export type LylaRequestOptions<
  C = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> = {
  url?: string
  method?: M['method']
  timeout?: number
  /**
   * True when credentials are to be included in a cross-origin request.
   * False when they are to be excluded in a cross-origin request and when
   * cookies are to be ignored in its response.
   */
  withCredentials?: boolean
  headers?: LylaRequestHeaders
  /**
   * Type of `response.body`.
   */
  responseType?: M['responseType']
  body?: M['requestBody']
  /**
   * JSON value to be written into the request body. It can't be used with
   * `body`.
   */
  json?: any
  query?: Record<
    string,
    | string
    | number
    | boolean
    | undefined
    | null
    | Array<string | number | boolean>
  >
  baseUrl?: string
  /**
   * Abort signal of the request.
   */
  signal?: AbortSignal
  onUploadProgress?: (progress: LylaProgress<C, M>) => void
  onDownloadProgress?: (progress: LylaProgress<C, M>) => void
  context?: C
  /**
   * Whether to allow get request with body. Default is false.
   * It's not recommended to use GET request with body.
   */
  allowGetBody?: boolean
  hooks?: {
    /**
     * Callbacks fired when options is passed into the request. In this moment,
     * request options haven't be normalized.
     */
    onInit?: Array<
      (
        options: LylaRequestOptionsWithContext<C, M>
      ) =>
        | LylaRequestOptionsWithContext<C, M>
        | Promise<LylaRequestOptionsWithContext<C, M>>
    >
    /**
     * Callbacks fired before request is sent. In this moment, request options is
     * normalized.
     */
    onBeforeRequest?: Array<
      (
        options: LylaRequestOptionsWithContext<C, M>
      ) =>
        | LylaRequestOptionsWithContext<C, M>
        | Promise<LylaRequestOptionsWithContext<C, M>>
    >
    /**
     * Callbacks fired after headers are received.
     */
    onHeadersReceived?: Array<
      (
        payload: {
          headers: Record<string, string>
          originalRequest: M['originalRequest']
          requestOptions: LylaRequestOptionsWithContext<C, M>
        },
        reject: (reason: unknown) => void
      ) => void
    >
    /**
     * Callbacks fired after response is received.
     */
    onAfterResponse?: Array<
      (
        response: LylaResponse<any, C, M>,
        reject: (reason: unknown) => void
      ) => LylaResponse<any, C, M> | Promise<LylaResponse<any, C, M>>
    >
    /**
     * Callbacks fired when there's error while response handling. It's only
     * fired by LylaError. Error thrown by user won't triggered the callback,
     * for example if user throws an error in `onAfterResponse` hook. The
     * callback won't be fired.
     */
    onResponseError?: Array<
      (
        error: LylaResponseError<C, M>,
        reject: (reason: unknown) => void
      ) => void | Promise<void>
    >
    /**
     * Callbacks fired when a non-response error occurs.
     */
    onNonResponseError?: Array<
      (error: LylaNonResponseError<C, M>) => void | Promise<void>
    >
  }
  extraOptions?: M['extraOptions']
}

export type LylaRequestOptionsWithContext<
  C = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> = Omit<LylaRequestOptions<C, M>, 'context'> & {
  context: C
}

export type LylaResponse<
  T = any,
  C = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> = {
  requestOptions: LylaRequestOptions<C, M>
  status: number
  statusText: string
  /**
   * Headers of the response. All the keys are in lower case.
   */
  headers: Record<string, string>
  /**
   * Response body.
   */
  body: M['responseBody']
  /**
   * JSON value of the response. If body is not valid JSON text, access the
   * field will cause an error.
   */
  json: T
  /**
   * Original
   */
  detail: M['responseDetail']
  /**
   * context
   */
  context: C
}

export type LylaProgress<C, M extends LylaAdapterMeta = LylaAdapterMeta> = {
  /**
   * Percentage of the progress. From 0 to 100.
   */
  percent: number
  /**
   * Loaded bytes of the progress.
   */
  loaded: number
  /**
   * Total bytes of the progress. If progress is not length-computable it would
   * be 0.
   */
  total: number
  /**
   * Whether the total bytes of the progress is computable.
   */
  lengthComputable: boolean
  /**
   * Detail message of progress
   */
  detail: M['progressDetail']
  /**
   * Original request
   */
  originalRequest: M['originalRequest']
  requestOptions: LylaRequestOptionsWithContext<C, M>
}

export type LylaRequestHeaders = Record<string, string | number | undefined>

export type Lyla<
  C = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> = LylaWithoutRetry<C, M> & {
  withRetry: LylaWithRetry<C, M>
}

export type LylaWithoutRetry<
  C = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> = {
  <T = any>(options: LylaRequestOptions<C, M>): Promise<LylaResponse<T, C, M>>
} & Record<
  Lowercase<M['method']>,
  <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions<C, M>, 'url' | 'method'>
  ) => Promise<LylaResponse<T, C, M>>
> & {
    errorType: LylaError<C, M>
  }

export type LylaRetryOnRejectedCommand<
  C = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> =
  | {
      action: 'retry'
      value: () => Promise<LylaRequestOptions<C, M>> | LylaRequestOptions<C, M>
    }
  | {
      action: 'reject'
      value: unknown
    }

export type LylaRetryOnResolvedCommand<
  T,
  C = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> =
  | {
      action: 'retry'
      value: () => Promise<LylaRequestOptions<C, M>> | LylaRequestOptions<C, M>
    }
  | {
      action: 'resolve'
      value: LylaResponse<T, C, M>
    }
  | {
      action: 'reject'
      value: unknown
    }

export type LylaWithRetryOptions<C, M extends LylaAdapterMeta, S> = {
  onResolved: (params: {
    state: S
    options: LylaRequestOptionsWithContext<C, M>
    response: LylaResponse<any, C, M>
  }) => Promise<LylaRetryOnResolvedCommand<any, C, M>>
  onRejected: (params: {
    state: S
    options: LylaRequestOptionsWithContext<C, M>
    lyla: Lyla<C, M>
    error: LylaError<C, M>
  }) => Promise<LylaRetryOnRejectedCommand<C, M>>
  createState: () => S
}

export type LylaWithRetry<
  C = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> = <S = any>(options: LylaWithRetryOptions<C, M, S>) => LylaWithoutRetry<C, M>

export interface LylaAdapterMeta {
  method: LylaMethod
  requestBody: any | undefined
  responseType: 'arraybuffer' | 'blob' | 'text'
  responseBody: any
  networkErrorDetail: any
  responseDetail: any
  progressDetail: any
  originalRequest: any
  extraOptions: any
}

export interface LylaAdapterOptions<T extends LylaAdapterMeta> {
  url: string
  method: T['method']
  headers: Record<string, string>
  body: T['requestBody'] | undefined
  json: object | undefined
  responseType: T['responseType']
  withCredentials: boolean
  extraOptions: T['extraOptions']
  onNetworkError(detail: T['networkErrorDetail']): void
  onUploadProgress:
    | ((progress: Omit<LylaProgress<unknown, T>, 'requestOptions'>) => void)
    | undefined
  onDownloadProgress:
    | ((progress: Omit<LylaProgress<unknown, T>, 'requestOptions'>) => void)
    | undefined
  onHeadersReceived:
    | ((
        headers: Record<string, string>,
        originalRequest: T['originalRequest']
      ) => void)
    | undefined
  onResponse(
    response: {
      body: T['responseBody']
      status: number
      headers: Record<string, string>
    },
    detail: T['responseDetail']
  ): void
}

export type LylaAdapter<T extends LylaAdapterMeta> = (
  options: LylaAdapterOptions<T>
) => { abort: () => void }
