import { LylaError } from './error'

export type LylaRequestOptions = {
  url?: string
  method?:
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
  responseType?: Exclude<XMLHttpRequestResponseType, 'document' | 'json' | ''>
  body?: XMLHttpRequestBodyInit
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
  onUploadProgress?: (
    progress: LylaProgress,
    progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void
  onDownloadProgress?: (
    progress: LylaProgress,
    progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void
  hooks?: {
    /**
     * Callbacks fired when options is passed into the request. In this moment,
     * request options haven't be normalized.
     */
    onInit?: Array<
      (
        options: LylaRequestOptions
      ) => LylaRequestOptions | Promise<LylaRequestOptions>
    >
    /**
     * Callbacks fired before request is sent. In this moment, request options is
     * normalized.
     */
    onBeforeRequest?: Array<
      (
        options: LylaRequestOptions
      ) => LylaRequestOptions | Promise<LylaRequestOptions>
    >
    /**
     * Callbacks fired after response is received.
     */
    onAfterResponse?: Array<
      (
        reqsponse: LylaResponse<any>
      ) => LylaResponse<any> | Promise<LylaResponse<any>>
    >
    /**
     * Callbacks fired when there's error while response handling. It's only
     * fired by LylaError. Error thrown by user won't triggered the callback,
     * for example if user throws an error in `onAfterResponse` hook. The
     * callback won't be fired.
     */
    onResponseError?: Array<(error: LylaError) => void>
  }
}

export type LylaResponse<T = any> = {
  status: number
  statusText: string
  /**
   * Headers of the response. All the keys are in lower case.
   */
  headers: Record<string, string>
  /**
   * Response body.
   */
  body: string | ArrayBuffer | Blob
  /**
   * JSON value of the response. If body is not valid JSON text, access the
   * field will cause an error.
   */
  json: T
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

export type Lyla = {
  <T = any>(options: LylaRequestOptions): Promise<LylaResponse<T>>
  extend: (
    options?:
      | LylaRequestOptions
      | ((options: LylaRequestOptions) => LylaRequestOptions)
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
  options: <T = any>(
    url: string,
    options?: Omit<LylaRequestOptions, 'url' | 'method'>
  ) => Promise<LylaResponse<T>>
}
