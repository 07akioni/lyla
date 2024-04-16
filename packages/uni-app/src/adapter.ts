import type {
  LylaAdapter,
  LylaAdapterMeta as LylaCoreAdapterMeta
} from '@lylajs/core'
import { headersKeyToLowerCase } from '@lylajs/core'
import type {
  NetworkErrorDetail,
  ResponseDetail,
  UniRequest,
  UniRequestMethod
} from './types'

declare const uni: {
  request: UniRequest
}

export interface LylaAdapterMeta extends LylaCoreAdapterMeta {
  method: UniRequestMethod
  networkErrorDetail: NetworkErrorDetail
  responseDetail: ResponseDetail
  responseType: 'arraybuffer' | 'text'
  requestBody: string | ArrayBuffer | Record<string, unknown>
  progressDetail: never
  originalRequest: never
  extraOptions: {
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
  }
}

export const adapter: LylaAdapter<LylaAdapterMeta> = ({
  url,
  method,
  headers,
  body,
  responseType,
  onResponse,
  onNetworkError,
  extraOptions
  // Not used, just leave it here
  // json,
  // withCredentials,
  // onDownloadProgress,
  // onUploadProgress,
}): {
  abort: () => void
} => {
  const requestTask = uni.request({
    url,
    method,
    header: headers,
    ...extraOptions,
    data: body,
    responseType,
    dataType: 'text',
    fail(res) {
      onNetworkError(res)
    },
    success(res) {
      onResponse(
        {
          body: res.data as string | ArrayBuffer,
          status: res.statusCode,
          headers: headersKeyToLowerCase(res.header)
        },
        res
      )
    }
  })
  return {
    abort() {
      requestTask.abort()
    }
  }
}
