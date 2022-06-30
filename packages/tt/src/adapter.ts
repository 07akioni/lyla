import type {
  LylaAdapter,
  LylaAdapterMeta as LylaCoreAdapterMeta,
} from '@lylajs/core'
import type {
  NetworkErrorDetail,
  ResponseDetail,
  TtRequest,
  TtRequestMethod
} from './types'

declare const tt: {
  request: TtRequest
}

export interface LylaAdapterMeta extends LylaCoreAdapterMeta {
  method: TtRequestMethod
  networkErrorDetail: NetworkErrorDetail
  responseDetail: ResponseDetail
  responseType: 'arraybuffer' | 'text'
  requestBody: string | ArrayBuffer
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
  const requestTask = tt.request({
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
          statusText: `${res.statusCode}`,
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
