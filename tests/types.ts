import type { Ceek, OnError } from '../src'

declare global {
  interface Window {
    ceek: Ceek
    onError: OnError
  }
}

export {}
