import { createLyla } from '../core.js'
import { xhrAdapter } from '../adapters/xhr.js'

export const xhrLyla = createLyla({ adapter: xhrAdapter })
