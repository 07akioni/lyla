import type { CatchError, Lyla, MatchError } from '../src'

declare global {
  interface Window {
    lyla: Lyla
    catchError: CatchError
    matchError: MatchError
  }
}

export {}
