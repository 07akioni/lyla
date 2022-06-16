export type ResponseDetail = {
  status: number
  headers: Record<string, string>
  data: string | object | ArrayBuffer
}

export type NetworkErrorDetail = {
  error: number
  errorMessage: string
}

export type MyRequestMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'get'
  | 'post'
  | 'put'
  | 'delete'

export type MyRequestOptions = {
  url: string
  headers?: Record<string, string>
  method?: MyRequestMethod
  data?: object | ArrayBuffer
  dataType?: 'JSON' | 'text' | 'base64' | 'arraybuffer'
  timeout?: number
  success?: (res: ResponseDetail) => void
  fail?: (res: NetworkErrorDetail) => void
  complete?: () => void
}

export type MyRequestTask = { abort: () => void }

export type MyRequest = (options: MyRequestOptions) => MyRequestTask
