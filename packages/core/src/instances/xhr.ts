import { createLyla } from '../core.js'
import { xhrAdapter } from '../adapters/xhr.js'

export const {
  lyla: xhrLyla,
  catchError: xhrCatchError,
  matchError: xhrMatchError
} = createLyla({ adapter: xhrAdapter })
