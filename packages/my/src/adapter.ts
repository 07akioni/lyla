import type {
  LylaAdapter,
  LylaAdapterMeta as LylaCoreAdapterMeta
} from '@lylajs/core'
import type {
  NetworkErrorDetail,
  ResponseDetail,
  MyRequest,
  MyRequestMethod
} from './types.js'

declare const tt: {
  request: MyRequest
}

export interface LylaAdapterMeta extends LylaCoreAdapterMeta {
  method: MyRequestMethod
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
    headers,
    data: typeof body === 'string' ? JSON.parse(body) : body,
    // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
    // Docs said if it's not json, response data won't be transformed to json.
    dataType: responseType,
    fail(res) {
      onNetworkError(res)
    },
    success(res) {
      onResponse(
        {
          body: res.data as string | ArrayBuffer,
          status: res.status,
          statusText: `${res.status}`,
          headers: res.headers
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
