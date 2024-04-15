export type ResponseDetail = {
  statusCode: number
  header: Record<string, string>
  data: string | object | ArrayBuffer
  cookies: string[]
  profile?: {
    redirectStart: number
    redirectEnd: number
    fetchStart: number
    domainLookupStart: number
    domainLookupEnd: number
    connectStart: number
    connectEnd: number
    SSLconnectionStart: number
    SSLconnectionEnd: number
    requestStart: number
    requestEnd: number
    responseStart: number
    responseEnd: number
    rtt: number
    estimate_nettype: number
    httpRttEstimate: number
    transportRttEstimate: number
    downstreamThroughputKbpsEstimate: number
    throughputKbps: number
    peerIP: string
    port: number
    socketReused: boolean
    sendBytesCount: number
    receivedBytedCount: number
    protocol: string
  }
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
  timeout?: number
  enableHttp2?: boolean
  enableQuic?: boolean
  enableCache?: boolean
  enableHttpDNS?: boolean
  httpDNSServiceId?: string
  enableChunked?: boolean
  forceCellularNetwork?: boolean
  success?: (res: ResponseDetail) => void
  fail?: (res: NetworkErrorDetail) => void
  complete?: (res: { errMsg: string }) => void
}

export type UniRequestTask = { abort: () => void }

export type UniRequest = (options: UniRequestOptions) => UniRequestTask
