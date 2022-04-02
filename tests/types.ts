import type { Lyla, OnError } from '../src'

declare global {
  interface Window {
    lyla: Lyla
    catchError: OnError
  }
}

export {}
