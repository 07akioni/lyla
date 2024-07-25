import {
  LylaAdapter,
  LylaAdapterMeta as LylaCoreAdapterMeta
} from '@lylajs/core'
import {
  ClientRequest,
  IncomingHttpHeaders,
  request as httpRequest
} from 'http'
import { request as httpsRequest } from 'https'
import { Readable, pipeline } from 'stream'
import { AxiosTransformStream } from './utils'

const transformNodeJsHeaders = (
  reaponseHeaders: NodeJS.Dict<string | string[]>
): Record<string, string> => {
  const headers: Record<string, string> = {}
  for (const _key in reaponseHeaders) {
    const key = _key.toLowerCase()
    const value = reaponseHeaders[key]
    if (Array.isArray(value)) {
      headers[key] = value.join(', ')
    } else {
      headers[key] = value || ''
    }
  }
  return headers
}

export interface LylaAdapterMeta extends LylaCoreAdapterMeta {
  method:
    | 'get'
    | 'GET'
    | 'post'
    | 'POST'
    | 'put'
    | 'PUT'
    | 'patch'
    | 'PATCH'
    | 'head'
    | 'HEAD'
    | 'delete'
    | 'DELETE'
    | 'options'
    | 'OPTIONS'
    | 'connect'
    | 'CONNECT'
    | 'trace'
    | 'TRACE'
  networkErrorDetail: Error
  requestBody: string | Buffer | Uint8Array
  responseDetail: null
  progressDetail: null
  responseType: 'text' | 'arraybuffer' | 'blob'
  originalRequest: ClientRequest
  extraOptions: never
}

export const adapter: LylaAdapter<LylaAdapterMeta> = ({
  url,
  method,
  headers: _headers,
  body,
  responseType,
  onHeadersReceived,
  onDownloadProgress,
  onUploadProgress,
  onResponse,
  onNetworkError
}): {
  abort: () => void
} => {
  // Since baseurl exits, it won't throw an error.
  // We don't parse it in @lylajs/core since url can be a relative path after resolution.
  const parsedUrl = new URL(url, 'http://localhost')

  let requestBodyStream: Readable | null = null

  const headers = Object.assign({}, _headers)

  let contentLength = 0
  if (body) {
    if (typeof body === 'string') {
      headers['Content-Length'] = `${(contentLength = Buffer.byteLength(body))}`
      requestBodyStream = Readable.from(body, {
        objectMode: false
      })
    } else if (Buffer.isBuffer(body)) {
      headers['Content-Length'] = `${(contentLength = body.length)}`
      requestBodyStream = Readable.from(body, {
        objectMode: false
      })
    } else if (body instanceof Uint8Array) {
      headers['Content-Length'] = `${(contentLength = body.byteLength)}`
      requestBodyStream = Readable.from(body, {
        objectMode: false
      })
    }
  }

  let responseHeaders: Record<string, string> | null = null
  function ensureResponseHeaders(
    incomingHttpHeaders: IncomingHttpHeaders
  ): Record<string, string> {
    if (responseHeaders === null) {
      responseHeaders = transformNodeJsHeaders(incomingHttpHeaders)
    }
    return responseHeaders
  }

  const clientRequest = (
    parsedUrl.protocol === 'http:' ? httpRequest : httpsRequest
  )(
    {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      method,
      headers,
      path: parsedUrl.pathname + parsedUrl.search,
      protocol: parsedUrl.protocol
    },
    (incomingMessage) => {
      if (onHeadersReceived) {
        onHeadersReceived(
          ensureResponseHeaders(incomingMessage.headers),
          clientRequest
        )
      }
      const rawResponseContentLength = incomingMessage.headers['content-length']
      const responseContentLength =
        typeof rawResponseContentLength === 'string' &&
        /^\d+$/.test(rawResponseContentLength)
          ? Number(rawResponseContentLength)
          : null
      const lengthComputable = responseContentLength !== null
      let loaded = 0
      const buffers: Buffer[] = []
      incomingMessage.on('data', (chunk: Buffer) => {
        buffers.push(chunk)
        loaded += chunk.length
        if (onDownloadProgress) {
          onDownloadProgress({
            lengthComputable,
            percent:
              responseContentLength === null
                ? 0
                : (loaded / responseContentLength) * 100,
            loaded,
            total: responseContentLength === null ? 0 : responseContentLength,
            detail: null,
            originalRequest: clientRequest
          })
        }
      })
      incomingMessage.on('end', () => {
        if (incomingMessage.complete) {
          const contentEncoding =
            incomingMessage.headers['content-encoding'] || 'utf8'
          onResponse(
            {
              status: incomingMessage.statusCode || 0,
              headers: ensureResponseHeaders(incomingMessage.headers),
              body:
                responseType === 'text'
                  ? Buffer.concat(buffers).toString(
                      contentEncoding as BufferEncoding
                    )
                  : responseType === 'blob'
                  ? new Blob(buffers)
                  : responseType === 'arraybuffer'
                  ? (Buffer.concat(buffers).buffer satisfies ArrayBuffer)
                  : null
            },
            null
          )
        } else {
          // https://nodejs.org/api/http.html#messagecomplete
          // Since data is incomplete, we view it as network error
          onNetworkError(
            new Error(
              'The connection was terminated while the response was still being sent'
            )
          )
        }
      })
    }
  )

  clientRequest.on('error', (e) => {
    onNetworkError(e)
  })

  const chunkedRequestBodyStream =
    requestBodyStream && onUploadProgress
      ? pipeline(
          [
            requestBodyStream,
            new AxiosTransformStream({
              length: contentLength,
              maxRate: undefined
            })
          ],
          () => undefined
        )
      : null

  if (onUploadProgress && chunkedRequestBodyStream) {
    let loaded = 0
    chunkedRequestBodyStream.on('data', (chunk) => {
      loaded += chunk.length
      onUploadProgress({
        lengthComputable: true,
        percent: contentLength ? (loaded / contentLength) * 100 : 0,
        loaded,
        total: contentLength,
        detail: null,
        originalRequest: clientRequest
      })
    })
  }

  const mergedRequestBodyStream = chunkedRequestBodyStream || requestBodyStream

  if (mergedRequestBodyStream) {
    let ended = false
    let errored = false

    mergedRequestBodyStream.on('data', (chunk) => {
      clientRequest.write(chunk)
    })

    mergedRequestBodyStream.on('error', (err) => {
      errored = true
      clientRequest.destroy(err)
    })

    mergedRequestBodyStream.on('end', () => {
      ended = true
      clientRequest.end()
    })

    mergedRequestBodyStream.on('close', () => {
      if (!ended && !errored) {
        // View stream destroy as abortion
        clientRequest.abort()
      }
    })
  } else {
    clientRequest.end()
  }

  return {
    abort() {
      clientRequest.abort()
    }
  }
}
