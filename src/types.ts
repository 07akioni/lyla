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
  withCredentials?: boolean
  headers?: LylaRequestHeaders
  responseType?: Exclude<XMLHttpRequestResponseType, 'document' | 'json' | ''>
  body?: XMLHttpRequestBodyInit
  json?: any
  query?: Record<string, string | number>
  baseUrl?: string
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

export type LylaProgress = {
  percent: number
  loaded: number
  total: number
  lengthComputable: boolean
}

export type LylaRequestHeaders = Record<string, string | number | undefined>
