export type ResponseDetail = {
  statusCode: number
  header: Record<string, string>
  data: string | object | ArrayBuffer
  trace: string
}

export type NetworkErrorDetail = {
  errCode: number
  errMsg: string
  trace: string
}

export type TtRequestMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'OPTIONS'
  | 'HEAD'
  | 'DELETE'
  | 'get'
  | 'post'
  | 'put'
  | 'options'
  | 'head'
  | 'delete'

export type TtRequestOptions = {
  url: string
  header?: Record<string, string>
  method?: TtRequestMethod
  data?: string | object | ArrayBuffer
  dataType?: 'json' | string
  responseType?: 'text' | 'arraybuffer'
  success?: (res: ResponseDetail) => void
  fail?: (res: NetworkErrorDetail) => void
  complete?: (res: { errMsg: string }) => void
}

export type TtRequestTask = { abort: () => void }

export type TtRequest = (options: TtRequestOptions) => TtRequestTask
