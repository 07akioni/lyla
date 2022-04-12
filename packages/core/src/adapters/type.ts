import type { LylaMethod, LylaProgress } from '../types.js'

export interface LylaAdapterMeta {
  requestBody: XMLHttpRequestBodyInit | undefined
  responseType: 'arraybuffer' | 'blob' | 'text'
  responseBody: string | ArrayBuffer | Blob
  networkErrorDetail: any
  responseDetail: any
}

export interface LylaAdapterOptions<T extends LylaAdapterMeta> {
  url: string
  method: LylaMethod
  headers: Record<string, string>
  body: T['requestBody']
  json: object | undefined
  responseType: T['responseType']
  withCredentials: boolean
  onNetworkError(detail: T['networkErrorDetail']): void
  onUploadProgress: ((progress: LylaProgress) => void) | undefined
  onDownloadProgress: ((progress: LylaProgress) => void) | undefined
  onResponse(
    response: {
      body: string | ArrayBuffer | Blob
      status: number
      statusText: string
      headers: Record<string, string>
    },
    detail: T['responseDetail']
  ): void
}

export type LylaAdapter<T extends LylaAdapterMeta> = (
  options: LylaAdapterOptions<T>
) => { abort: () => void }
