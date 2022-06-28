export class LylaAbortController {
  signal: LylaAbortSignal
  constructor() {
    this.signal = new LylaAbortSignal()
  }
  abort(reason?: any): void {
    if (this.signal.aborted) return
    this.signal.__abort(reason)
    this.signal.__listeners
  }
}

export class LylaAbortSignal {
  aborted: boolean
  reason: any
  __listeners: Set<() => void>
  constructor() {
    this.aborted = false
    this.__listeners = new Set()
  }
  addEventListener(type: 'abort', listener: () => void) {
    this.__listeners.add(listener)
  }
  removeEventListener(type: 'abort', listener: () => void) {
    this.__listeners.delete(listener)
  }
  __abort(reason?: any) {
    this.aborted = true
    this.reason = reason
  }
}
