import type { LylaMethod, LylaProgress } from '../types.js'

export interface LylaAdapterOptions {
  url: string
  method: LylaMethod
  headers: Record<string, string>
  body: Blob | BufferSource | FormData | URLSearchParams | string | undefined
  json: object | undefined
  responseType: 'arraybuffer' | 'blob' | 'text'
  withCredentials: boolean
  onNetworkError(detail: { e: ProgressEvent<XMLHttpRequestEventTarget> }): void
  onUploadProgress: ((progress: LylaProgress) => void) | undefined
  onDownloadProgress: ((progress: LylaProgress) => void) | undefined
  onResponse(
    response: {
      body: string | ArrayBuffer | Blob
      status: number
      statusText: string
      headers: Record<string, string>
    },
    e: ProgressEvent<XMLHttpRequestEventTarget>
  ): void
}

export type LylaAdapter = (options: LylaAdapterOptions) => { abort: () => void }
