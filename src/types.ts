export type CeekOptions = {
  baseUrl?: string
  withCredentials?: boolean
  headers?: Record<string, string>
  hooks?: {
    onBeforeOptionsNormalized: Array<
      (
        options: CeekRequestOptions
      ) => CeekRequestOptions | Promise<CeekRequestOptions>
    >
    onBeforeRequest: Array<
      (
        options: CeekRequestOptions
      ) => CeekRequestOptions | Promise<CeekRequestOptions>
    >
    onAfterResponse: Array<
      (
        reqsponse: CeekResponse<any>
      ) => CeekResponse<any> | Promise<CeekResponse<any>>
    >
  }
}

export type CeekRequestOptions = {
  method:
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
  url: string
  timeout?: number
  withCredentials?: boolean
  headers?: Record<string, string>
  responseType?: Exclude<XMLHttpRequestResponseType, 'document' | 'json' | ''>
  body?: XMLHttpRequestBodyInit
  json?: any
  query?: Record<string, string>
  baseUrl?: string
  onUploadProgress?: (
    progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void
  onDownloadProgress?: (
    progressEvent: ProgressEvent<XMLHttpRequestEventTarget>
  ) => void
}

export type CeekResponse<T = any> = {
  status: number
  statusText: string
  headers: Record<string, string>
  body: string | ArrayBuffer | Blob
  json: T
}