export type ResponseDetail = {
  statusCode: number
  header: Record<string, string>
  data: string | object | ArrayBuffer
}

export type NetworkErrorDetail = {
  errMsg: string
}

export type QqRequestMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'OPTIONS'
  | 'HEAD'
  | 'DELETE'
  | 'TRACE'
  | 'CONNECT'
  | 'get'
  | 'post'
  | 'put'
  | 'options'
  | 'head'
  | 'delete'
  | 'trace'
  | 'connect'

export type QqRequestOptions = {
  url: string
  header?: Record<string, string>
  method?: QqRequestMethod
  data?: string | object | ArrayBuffer
  dataType?: 'json' | string
  responseType?: 'text' | 'arraybuffer'
  success?: (res: ResponseDetail) => void
  fail?: (res: NetworkErrorDetail) => void
  complete?: (res: { errMsg: string }) => void
}

export type QqRequestTask = { abort: () => void }

export type QqRequest = (options: QqRequestOptions) => QqRequestTask
