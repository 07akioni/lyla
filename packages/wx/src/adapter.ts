import type {
  LylaAdapter,
  LylaAdapterMeta as LylaCoreAdapterMeta
} from '@lylajs/core'
import type {
  NetworkErrorDetail,
  ResponseDetail,
  WxRequest,
  WxRequestMethod
} from './types'

declare const wx: {
  request: WxRequest
}

export interface LylaAdapterMeta extends LylaCoreAdapterMeta {
  method: WxRequestMethod
  networkErrorDetail: NetworkErrorDetail
  responseDetail: ResponseDetail
  responseType: 'arraybuffer' | 'text'
  requestBody: string | ArrayBuffer
  progressDetail: never
  originalRequest: never
}

export const adapter: LylaAdapter<LylaAdapterMeta> = ({
  url,
  method,
  headers,
  body,
  responseType,
  onResponse,
  onNetworkError
  // Not used, just leave it here
  // json,
  // withCredentials,
  // onDownloadProgress,
  // onUploadProgress,
}): {
  abort: () => void
} => {
  const requestTask = wx.request({
    url,
    method,
    header: headers,
    data: body,
    responseType,
    // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
    // Docs said if it's not json, response data won't be transformed to json.
    dataType: 'text',
    fail(res) {
      onNetworkError(res)
    },
    success(res) {
      onResponse(
        {
          body: res.data as string | ArrayBuffer,
          status: res.statusCode,
          headers: res.header
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
