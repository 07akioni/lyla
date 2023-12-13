// refs:
// https://github.com/axios/axios/blob/v1.x/lib/helpers/AxiosTransformStream.js
import { Transform } from 'stream'

/**
 * Calculate data maxRate
 * @param {Number} [samplesCount= 10]
 * @param {Number} [min= 1000]
 * @returns {Function}
 */
function speedometer(samplesCount, min) {
  samplesCount = samplesCount || 10
  const bytes = new Array(samplesCount)
  const timestamps = new Array(samplesCount)
  let head = 0
  let tail = 0
  let firstSampleTS

  min = min !== undefined ? min : 1000

  return function push(chunkLength) {
    const now = Date.now()

    const startedAt = timestamps[tail]

    if (!firstSampleTS) {
      firstSampleTS = now
    }

    bytes[head] = chunkLength
    timestamps[head] = now

    let i = tail
    let bytesCount = 0

    while (i !== head) {
      bytesCount += bytes[i++]
      i = i % samplesCount
    }

    head = (head + 1) % samplesCount

    if (head === tail) {
      tail = (tail + 1) % samplesCount
    }

    if (now - firstSampleTS < min) {
      return
    }

    const passed = startedAt && now - startedAt

    return passed ? Math.round((bytesCount * 1000) / passed) : undefined
  }
}

/**
 * Throttle decorator
 * @param {Function} fn
 * @param {Number} freq
 * @return {Function}
 */
function throttle(fn, freq) {
  let timestamp = 0
  const threshold = 1000 / freq
  let timer = null
  return function throttled(force, args) {
    const now = Date.now()
    if (force || now - timestamp > threshold) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      timestamp = now
      return fn.apply(null, args)
    }
    if (!timer) {
      timer = setTimeout(() => {
        timer = null
        timestamp = Date.now()
        return fn.apply(null, args)
      }, threshold - (now - timestamp))
    }
  }
}

const kInternals = Symbol('internals')

class AxiosTransformStream extends Transform {
  constructor(options) {
    options = Object.assign(options, {
      maxRate: 0,
      chunkSize: 64 * 1024,
      minChunkSize: 100,
      timeWindow: 500,
      ticksRate: 2,
      samplesCount: 15
    })

    super({
      readableHighWaterMark: options.chunkSize
    })

    const self = this

    const internals = (this[kInternals] = {
      length: options.length,
      timeWindow: options.timeWindow,
      ticksRate: options.ticksRate,
      chunkSize: options.chunkSize,
      maxRate: options.maxRate,
      minChunkSize: options.minChunkSize,
      bytesSeen: 0,
      isCaptured: false,
      notifiedBytesLoaded: 0,
      ts: Date.now(),
      bytes: 0,
      onReadCallback: null
    })

    const _speedometer = speedometer(
      internals.ticksRate * options.samplesCount,
      internals.timeWindow
    )

    this.on('newListener', (event) => {
      if (event === 'progress') {
        if (!internals.isCaptured) {
          internals.isCaptured = true
        }
      }
    })

    let bytesNotified = 0

    internals.updateProgress = throttle(function throttledHandler() {
      const totalBytes = internals.length
      const bytesTransferred = internals.bytesSeen
      const progressBytes = bytesTransferred - bytesNotified
      if (!progressBytes || self.destroyed) return

      const rate = _speedometer(progressBytes)

      bytesNotified = bytesTransferred

      process.nextTick(() => {
        self.emit('progress', {
          loaded: bytesTransferred,
          total: totalBytes,
          progress: totalBytes ? bytesTransferred / totalBytes : undefined,
          bytes: progressBytes,
          rate: rate ? rate : undefined,
          estimated:
            rate && totalBytes && bytesTransferred <= totalBytes
              ? (totalBytes - bytesTransferred) / rate
              : undefined
        })
      })
    }, internals.ticksRate)

    const onFinish = () => {
      internals.updateProgress(true)
    }

    this.once('end', onFinish)
    this.once('error', onFinish)
  }

  _read(size) {
    const internals = this[kInternals]

    if (internals.onReadCallback) {
      internals.onReadCallback()
    }

    return super._read(size)
  }

  _transform(chunk, encoding, callback) {
    const self = this
    const internals = this[kInternals]
    const maxRate = internals.maxRate

    const readableHighWaterMark = this.readableHighWaterMark

    const timeWindow = internals.timeWindow

    const divider = 1000 / timeWindow
    const bytesThreshold = maxRate / divider
    const minChunkSize =
      internals.minChunkSize !== false
        ? Math.max(internals.minChunkSize, bytesThreshold * 0.01)
        : 0

    function pushChunk(_chunk, _callback) {
      const bytes = Buffer.byteLength(_chunk)
      internals.bytesSeen += bytes
      internals.bytes += bytes

      if (internals.isCaptured) {
        internals.updateProgress()
      }

      if (self.push(_chunk)) {
        process.nextTick(_callback)
      } else {
        internals.onReadCallback = () => {
          internals.onReadCallback = null
          process.nextTick(_callback)
        }
      }
    }

    const transformChunk = (_chunk, _callback) => {
      const chunkSize = Buffer.byteLength(_chunk)
      let chunkRemainder = null
      let maxChunkSize = readableHighWaterMark
      let bytesLeft
      let passed = 0

      if (maxRate) {
        const now = Date.now()

        if (!internals.ts || (passed = now - internals.ts) >= timeWindow) {
          internals.ts = now
          bytesLeft = bytesThreshold - internals.bytes
          internals.bytes = bytesLeft < 0 ? -bytesLeft : 0
          passed = 0
        }

        bytesLeft = bytesThreshold - internals.bytes
      }

      if (maxRate) {
        if (bytesLeft <= 0) {
          // next time window
          return setTimeout(() => {
            _callback(null, _chunk)
          }, timeWindow - passed)
        }

        if (bytesLeft < maxChunkSize) {
          maxChunkSize = bytesLeft
        }
      }

      if (
        maxChunkSize &&
        chunkSize > maxChunkSize &&
        chunkSize - maxChunkSize > minChunkSize
      ) {
        chunkRemainder = _chunk.subarray(maxChunkSize)
        _chunk = _chunk.subarray(0, maxChunkSize)
      }

      pushChunk(
        _chunk,
        chunkRemainder
          ? () => {
              process.nextTick(_callback, null, chunkRemainder)
            }
          : _callback
      )
    }

    transformChunk(chunk, function transformNextChunk(err, _chunk) {
      if (err) {
        return callback(err)
      }

      if (_chunk) {
        transformChunk(_chunk, transformNextChunk)
      } else {
        callback(null)
      }
    })
  }

  setLength(length) {
    this[kInternals].length = +length
    return this
  }
}

export { AxiosTransformStream }
