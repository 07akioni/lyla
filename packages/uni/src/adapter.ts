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

  const requestTask = uni.request({
    url,
    method,
    header: headers,
    //@ts-ignore
    data: isJSON(body) ? JSON.parse(body) : body,
    responseType,
    // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
    // Docs said if it's not json, response data won't be transformed to json.
    dataType: 'json',
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


function isJSON(str: any) {
  if (typeof str === 'string' && str) {
    if (Object.prototype.toString.call(JSON.parse(str)) === '[object Object]') {
      return true;
    }
    return false;
  }
  return false
}
