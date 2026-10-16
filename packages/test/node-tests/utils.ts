import type {
  LylaAdapter,
  LylaAdapterMeta,
  LylaAdapterOptions
} from '@lylajs/core'

export type FakeRequest = LylaAdapterOptions<LylaAdapterMeta>

export type FakeResponse = {
  status?: number
  headers?: Record<string, string>
  body?: unknown
}

export function respond(request: FakeRequest, response: FakeResponse = {}) {
  request.onResponse(
    { status: 200, headers: {}, body: '', ...response },
    'response detail'
  )
}

/**
 * `handle` is called for every request sent by the adapter. It can return a
 * callback which will be called when the request is aborted. By default, every
 * request is responded with status 200 asynchronously.
 */
export function createFakeAdapter(
  handle: (request: FakeRequest) => void | (() => void) = (request) => {
    setTimeout(() => respond(request))
  }
) {
  const requests: FakeRequest[] = []
  let abortCount = 0
  const adapter: LylaAdapter<LylaAdapterMeta> = (request) => {
    requests.push(request)
    const onAbort = handle(request)
    return {
      abort() {
        abortCount++
        if (onAbort) onAbort()
      }
    }
  }
  return { adapter, requests, getAbortCount: () => abortCount }
}

export async function catchError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise
  } catch (error) {
    return error
  }
  throw new Error('Expected the promise to be rejected')
}

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
