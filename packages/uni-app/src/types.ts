export type ResponseDetail = {
  statusCode: number
  header: Record<string, string>
  data: string | object | ArrayBuffer
  cookies: string[]
}

export type NetworkErrorDetail = { errno: number; errMsg: string }

export type UniRequestMethod =
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

export type UniRequestOptions = {
  url: string
  header?: Record<string, string>
  method?: UniRequestMethod
  data?: string | object | ArrayBuffer
  dataType?: 'json' | string
  responseType?: 'text' | 'arraybuffer'
  sslVerify?: boolean
  withCredentials?: boolean
  firstIpv4?: boolean
  timeout?: number
  enableHttp2?: boolean
  enableQuic?: boolean
  enableCache?: boolean
  enableHttpDNS?: boolean
  httpDNSServiceId?: string
  enableChunked?: boolean
  forceCellularNetwork?: boolean
  enableCookie?: boolean
  cloudCache?: boolean
  defer?: Boolean
  success?: (res: ResponseDetail) => void
  fail?: (res: NetworkErrorDetail) => void
  complete?: (res: { errMsg: string }) => void
}

export type UniRequestTask = { abort: () => void }

export type UniRequest = (options: UniRequestOptions) => UniRequestTask
