import {
  LylaAdapter,
  LylaAdapterMeta as LylaCoreAdapterMeta
} from '@lylajs/core'
import { ClientRequest, request as httpRequest } from 'http'
import { request as httpsRequest } from 'https'
import { Readable } from 'stream'

const transformNodeJsHeaders = (
  reaponseHeaders: NodeJS.Dict<string | string[]>
): Record<string, string> => {
  const headers: Record<string, string> = {}
  for (const key in reaponseHeaders) {
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
  responseDetail: any
  progressDetail: null
  responseType: 'text' // TODO, buffer, arraybuffer, blob
  originalRequest: ClientRequest
}

export const adapter: LylaAdapter<LylaAdapterMeta> = ({
  url,
  method,
  headers: _headers,
  body,
  responseType,
  onDownloadProgress,
  onUploadProgress,
  onResponse,
  onNetworkError
}): {
  abort: () => void
} => {
  // TODO: url parser error
  const parsedUrl = new URL(url, 'http://localhost')

  let requestBodyStream: Readable | null = null

  const headers = Object.assign({}, _headers)

  let contentLength = 0
  if (body) {
    if (typeof body === 'string') {
      headers['Content-Length'] = `${(contentLength = Buffer.byteLength(body))}`
      requestBodyStream = Readable.from(body)
    } else if (Buffer.isBuffer(body)) {
      headers['Content-Length'] = `${(contentLength = body.length)}`
      requestBodyStream = Readable.from(body)
    } else if (body instanceof Uint8Array) {
      headers['Content-Length'] = `${(contentLength = body.byteLength)}`
      requestBodyStream = Readable.from(body)
    }
  }

  const clientRequest = (
    parsedUrl.protocol === 'http' ? httpRequest : httpsRequest
  )(
    {
      hostname: parsedUrl.hostname,
      method,
      headers,
      path: parsedUrl.pathname + parsedUrl.search,
      protocol: parsedUrl.protocol
    },
    (incomingMessage) => {
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
        if (!incomingMessage.complete) {
          onResponse(
            {
              status: incomingMessage.statusCode || 0,
              // TODO: headers 的 case 问题，感觉最好 key 统一转化为小写
              headers: transformNodeJsHeaders(incomingMessage.headers),
              // TODO: content-encoding
              body:
                responseType === 'text'
                  ? Buffer.concat(buffers).toString('utf8')
                  : ''
            },
            null
          )
        } else {
          // TODO: error handling
          // https://nodejs.org/api/http.html#messagecomplete
          clientRequest.abort()
        }
      })
    }
  )

  clientRequest.on('error', (e) => {
    onNetworkError(e)
  })

  if (onUploadProgress && requestBodyStream) {
    let loaded = 0
    requestBodyStream.on('data', (chunk) => {
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

  if (requestBodyStream) {
    let ended = false
    let errored = false

    requestBodyStream.on('end', () => {
      ended = true
    })

    requestBodyStream.once('error', (err) => {
      errored = true
      clientRequest.destroy(err)
    })

    requestBodyStream.on('close', () => {
      if (!ended && !errored) {
        // TODO: error handling
        clientRequest.abort()
      }
    })

    requestBodyStream.pipe(clientRequest)
  } else {
    clientRequest.end()
  }

  return {
    abort() {
      clientRequest.abort()
    }
  }
}
