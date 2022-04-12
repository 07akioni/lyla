import type { LylaResponseError } from './error.js'

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

export type LylaRequestOptions<M extends LylaAdapterMeta = LylaAdapterMeta> = {
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
  body?: M['responseBody']
  /**
   * JSON value to be written into the request body. It can't be used with
   * `body`.
   */
  json?: any
  query?: Record<string, string | number>
  baseUrl?: string
  /**
   * Abort signal of the request.
   */
  signal?: AbortSignal
  onUploadProgress?: (progress: LylaProgress) => void
  onDownloadProgress?: (progress: LylaProgress) => void
  hooks?: {
    /**
     * Callbacks fired when options is passed into the request. In this moment,
     * request options haven't be normalized.
     */
    onInit?: Array<
      (
        options: LylaRequestOptions<M>
      ) => LylaRequestOptions<M> | Promise<LylaRequestOptions<M>>
    >
    /**
     * Callbacks fired before request is sent. In this moment, request options is
     * normalized.
     */
    onBeforeRequest?: Array<
      (
        options: LylaRequestOptions<M>
      ) => LylaRequestOptions<M> | Promise<LylaRequestOptions<M>>
    >
    /**
     * Callbacks fired after response is received.
     */
    onAfterResponse?: Array<
      (
        reqsponse: LylaResponse<any, M>
      ) => LylaResponse<any, M> | Promise<LylaResponse<any, M>>
    >
    /**
     * Callbacks fired when there's error while response handling. It's only
     * fired by LylaError. Error thrown by user won't triggered the callback,
     * for example if user throws an error in `onAfterResponse` hook. The
     * callback won't be fired.
     */
    onResponseError?: Array<(error: LylaResponseError<M>) => void>
  }
}

export type LylaResponse<
  T = any,
  M extends LylaAdapterMeta = LylaAdapterMeta
> = {
  requestOptions: LylaRequestOptions<M>
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
}

export type LylaProgress = {
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
}

export type LylaRequestHeaders = Record<string, string | number | undefined>

export type Lyla<M extends LylaAdapterMeta = LylaAdapterMeta> = {
  <T = any>(options: LylaRequestOptions<M>): Promise<LylaResponse<T, M>>
  extend: (options?: LylaRequestOptions<M>) => Lyla<M>
  get: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions<M>, 'url' | 'method'>
  ) => Promise<LylaResponse<T, M>>
  post: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions<M>, 'url' | 'method'>
  ) => Promise<LylaResponse<T, M>>
  put: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions<M>, 'url' | 'method'>
  ) => Promise<LylaResponse<T, M>>
  patch: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions<M>, 'url' | 'method'>
  ) => Promise<LylaResponse<T, M>>
  head: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions<M>, 'url' | 'method'>
  ) => Promise<LylaResponse<T, M>>
  delete: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions<M>, 'url' | 'method'>
  ) => Promise<LylaResponse<T, M>>
  options: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions<M>, 'url' | 'method'>
  ) => Promise<LylaResponse<T, M>>
}

export interface LylaAdapterMeta {
  method: LylaMethod
  requestBody: XMLHttpRequestBodyInit | undefined
  responseType: 'arraybuffer' | 'blob' | 'text'
  responseBody: string | ArrayBuffer | Blob
  networkErrorDetail: any
  responseDetail: any
}

export interface LylaAdapterOptions<T extends LylaAdapterMeta> {
  url: string
  method: T['method']
  headers: Record<string, string>
  body: T['requestBody']
  json: object | undefined
  responseType: T['responseType']
  withCredentials: boolean
  onNetworkError(detail: T['networkErrorDetail']): void
  onUploadProgress: ((progress: LylaProgress) => void) | undefined
  onDownloadProgress: ((progress: LylaProgress) => void) | undefined
  onResponse(
    response: {
      body: string | ArrayBuffer | Blob
      status: number
      statusText: string
      headers: Record<string, string>
    },
    detail: T['responseDetail']
  ): void
}

export type LylaAdapter<T extends LylaAdapterMeta> = (
  options: LylaAdapterOptions<T>
) => { abort: () => void }
