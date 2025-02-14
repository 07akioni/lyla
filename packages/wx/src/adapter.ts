import type {
  LylaAdapter,
  LylaAdapterMeta as LylaCoreAdapterMeta
} from '@lylajs/core'
import { headersKeyToLowerCase } from '@lylajs/core'
import type {
  NetworkErrorDetail,
  ResponseDetail,
  WxRequest,
  WxRequestMethod,
  WxRequestTask
} from './types'
import { arrayBufferToString } from './utils'

declare const wx: {
  request: WxRequest
}

export interface LylaAdapterMeta extends LylaCoreAdapterMeta {
  method: WxRequestMethod
  networkErrorDetail: NetworkErrorDetail
  responseDetail: ResponseDetail
  responseType: 'arraybuffer' | 'text'
  requestBody: string | ArrayBuffer
  progressDetail: { data: ArrayBuffer; responseText: string }
  originalRequest: WxRequestTask
  extraOptions: Partial<{
    enableHttp2: boolean
    timeout: number
    enableQuic: boolean
    enableCache: boolean
    enableHttpDNS: boolean
    httpDNSServiceId: string
    forceCellularNetwork: boolean
  }>
}

export const adapter: LylaAdapter<LylaAdapterMeta> = ({
  url,
  method,
  headers,
  body,
  responseType,
  onResponse,
  onNetworkError,
  // Not used, just leave it here
  // json,
  // withCredentials,
  onDownloadProgress,
  onHeadersReceived,
  extraOptions
  // onUploadProgress,
}): {
  abort: () => void
} => {
  let latestProgressData: Uint8Array | undefined = undefined

  const requestTask = wx.request({
    url,
    method,
    header: headers,
    data: body,
    responseType,
    enableHttp2: extraOptions?.enableHttp2,
    timeout: extraOptions?.timeout,
    enableQuic: extraOptions?.enableQuic,
    enableCache: extraOptions?.enableCache,
    enableHttpDNS: extraOptions?.enableHttpDNS,
    httpDNSServiceId: extraOptions?.httpDNSServiceId,
    forceCellularNetwork: extraOptions?.forceCellularNetwork,
    enableChunked: !!onDownloadProgress,
    // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
    // Docs said if it's not json, response data won't be transformed to json.
    dataType: 'text',
    fail(res) {
      onNetworkError(res)
    },
    success(res) {
      let body: string | ArrayBuffer
      if (onDownloadProgress) {
        if (responseType === 'arraybuffer') {
          body = latestProgressData || new ArrayBuffer(0)
        } else {
          body = arrayBufferToString(latestProgressData || new ArrayBuffer(0))
        }
      } else {
        body = res.data as string | ArrayBuffer
      }
      onResponse(
        {
          body,
          status: res.statusCode,
          headers: headersKeyToLowerCase(res.header)
        },
        res
      )
    }
  })
  if (onDownloadProgress) {
    requestTask.onChunkReceived((detail) => {
      if (!latestProgressData) {
        latestProgressData = new Uint8Array([])
      }
      let mergedProgressData = new Uint8Array(
        latestProgressData.byteLength + detail.data.byteLength
      )
      mergedProgressData.set(latestProgressData, 0)
      mergedProgressData.set(
        detail.data instanceof Uint8Array
          ? detail.data
          : new Uint8Array(detail.data),
        latestProgressData.byteLength
      )
      latestProgressData = mergedProgressData

      onDownloadProgress({
        detail: {
          data: detail.data,
          responseText: arrayBufferToString(latestProgressData)
        },
        lengthComputable: false,
        loaded: 0,
        originalRequest: requestTask,
        total: 0,
        percent: 0
      })
    })
  }
  if (onHeadersReceived) {
    requestTask.onHeadersReceived(({ header }) => {
      onHeadersReceived(header, requestTask)
    })
  }
  return {
    abort() {
      requestTask.abort()
    }
  }
}
