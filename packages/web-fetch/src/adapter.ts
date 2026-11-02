import type {
  LylaAdapter,
  LylaAdapterMeta as LylaCoreAdapterMeta
} from '@lylajs/core'

export interface LylaAdapterMeta extends LylaCoreAdapterMeta {
  requestBody: BodyInit
  responseBody: string | ArrayBuffer | Blob
  networkErrorDetail: unknown
  responseDetail: Response
  progressDetail: ReadableStreamReadResult<Uint8Array>
  originalRequest: Request
  extraOptions: {
    /** Native fetch options. Lyla controls the method, headers, body and signal. */
    fetchOptions?: Omit<RequestInit, 'method' | 'headers' | 'body' | 'signal'> & {
      duplex?: 'half'
    }
  }
}

export const adapter: LylaAdapter<LylaAdapterMeta> = ({
  url,
  method,
  headers,
  body,
  responseType,
  withCredentials,
  extraOptions,
  onDownloadProgress,
  onUploadProgress,
  onResponse,
  onNetworkError,
  onHeadersReceived
}) => {
  if (onUploadProgress) {
    throw new Error('The fetch adapter does not support `onUploadProgress`')
  }

  const controller = new AbortController()
  const fetchOptions = extraOptions?.fetchOptions
  const requestInit: RequestInit & { duplex?: 'half' } = {
    ...fetchOptions,
    method,
    headers,
    body,
    credentials:
      fetchOptions?.credentials || (withCredentials ? 'include' : 'same-origin'),
    signal: controller.signal
  }
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
    requestInit.duplex = fetchOptions?.duplex ?? 'half'
  }
  const request = new Request(url, requestInit)

  async function readBody(response: Response) {
    if (!onDownloadProgress || !response.body) {
      return responseType === 'arraybuffer'
        ? response.arrayBuffer()
        : responseType === 'blob'
          ? response.blob()
          : response.text()
    }

    const contentLength = response.headers.get('content-length')
    // Fetch exposes decoded bytes, while Content-Length describes encoded bytes.
    const lengthComputable =
      contentLength !== null &&
      /^\d+$/.test(contentLength) &&
      Number.isSafeInteger(Number(contentLength)) &&
      (!response.headers.has('content-encoding') ||
        response.headers.get('content-encoding') === 'identity')
    const total = lengthComputable ? Number(contentLength) : 0
    const chunks: Uint8Array<ArrayBuffer>[] = []
    const reader = response.body.getReader()
    let loaded = 0
    try {
      while (true) {
        const detail = await reader.read()
        if (controller.signal.aborted) {
          await reader.cancel()
          return
        }
        if (detail.done) break
        chunks.push(new Uint8Array(detail.value))
        loaded += detail.value.byteLength
        onDownloadProgress({
          lengthComputable,
          loaded,
          total,
          percent: lengthComputable && total > 0 ? (loaded / total) * 100 : 0,
          detail,
          originalRequest: request
        })
      }
    } finally {
      reader.releaseLock()
    }
    const blob = new Blob(chunks, {
      type: response.headers.get('content-type') ?? ''
    })
    return responseType === 'arraybuffer'
      ? blob.arrayBuffer()
      : responseType === 'blob'
        ? blob
        : blob.text()
  }

  void fetch(request)
    .then(async (response) => {
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })
      if (!controller.signal.aborted) {
        onHeadersReceived?.(responseHeaders, request)
      }
      if (controller.signal.aborted) {
        await response.body?.cancel()
        return
      }
      const body = await readBody(response)
      if (controller.signal.aborted) return
      onResponse(
        { status: response.status, headers: responseHeaders, body: body! },
        response
      )
    })
    .catch((error: unknown) => {
      // Successful Request construction does not guarantee a network request
      // will be sent. A same-origin violation or an only-if-cached cache miss
      // can still make fetch reject with TypeError before sending anything.
      // NETWORK here means the underlying fetch or response read failed; it
      // does not prove a connection failure or that a request was sent. Neither
      // asynchronous rejection nor TypeError reliably identifies that stage.
      if (!controller.signal.aborted) {
        onNetworkError(error, error instanceof Error ? error : undefined)
      }
    })

  return {
    abort() {
      controller.abort()
    }
  }
}
