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
    | 'delete'
  timeout?: number
  withCredentials?: boolean
  headers?: Record<string, string>
  responseType?: Exclude<XMLHttpRequestResponseType, 'document' | 'json' | ''>
  body?: XMLHttpRequestBodyInit
  json?: any
  query?: Record<string, string>
  baseUrl?: string
  signal?: AbortSignal
  onUploadProgress?: (
    progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void
  onDownloadProgress?: (
    progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void
  hooks?: {
    onBeforeOptionsNormalized?: Array<
      (
        options: LylaRequestOptions
      ) => LylaRequestOptions | Promise<LylaRequestOptions>
    >
    onBeforeRequest?: Array<
      (
        options: LylaRequestOptions
      ) => LylaRequestOptions | Promise<LylaRequestOptions>
    >
    onAfterResponse?: Array<
      (
        reqsponse: LylaResponse<any>
      ) => LylaResponse<any> | Promise<LylaResponse<any>>
    >
  }
}

export type LylaResponse<T = any> = {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string | ArrayBuffer | Blob
  json: T
}