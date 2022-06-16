import { catchError, matchError, Lyla, LYLA_ERROR } from '@lylajs/web';

declare global {
  interface Window {
    lyla: Lyla
    catchError: typeof catchError
    matchError: typeof matchError
    LYLA_ERROR: typeof LYLA_ERROR
  }
}

export {}
