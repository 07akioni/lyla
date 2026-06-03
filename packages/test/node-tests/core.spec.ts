// @vitest-environment node
import { createLyla, isLylaError, LYLA_ERROR } from '@lylajs/core'
import { describe, expect, it } from 'vitest'

describe('core retry', () => {
  it('throws non-lyla errors returned by onResolved reject action directly', async () => {
    const originalError = new Error('resolved reject')
    const { lyla } = createLyla(
      ({ onResponse }) => {
        setTimeout(() => {
          onResponse(
            {
              body: '',
              headers: {},
              status: 200
            },
            undefined
          )
        })
        return {
          abort() {}
        }
      },
      {
        context: undefined
      }
    )
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: async () => ({
        action: 'reject',
        value: originalError
      }),
      onRejected: async () => ({
        action: 'reject',
        value: new Error('unexpected')
      })
    })

    await expect(lylaWithRetry.get('/')).rejects.toBe(originalError)
  })

  it('throws non-lyla errors returned by onRejected reject action directly', async () => {
    const originalError = new Error('rejected reject')
    const { lyla } = createLyla(
      ({ onNetworkError }) => {
        setTimeout(() => {
          onNetworkError(new Error('network'))
        })
        return {
          abort() {}
        }
      },
      {
        context: undefined
      }
    )
    const lylaWithRetry = lyla.withRetry({
      createState: () => undefined,
      onResolved: async () => ({
        action: 'resolve',
        value: undefined as any
      }),
      onRejected: async () => ({
        action: 'reject',
        value: originalError
      })
    })

    await expect(lylaWithRetry.get('/')).rejects.toBe(originalError)
  })
})

describe('core timeout', () => {
  it('keeps timeout error when abort triggers adapter callbacks', async () => {
    const { lyla } = createLyla(
      ({ onNetworkError, onResponse }) => {
        return {
          abort() {
            onNetworkError(new Error('aborted'))
            onResponse(
              {
                body: '',
                headers: {},
                status: 0
              },
              undefined
            )
          }
        }
      },
      {
        context: undefined
      }
    )

    try {
      await lyla.get('/', {
        timeout: 1
      })
      throw new Error('Expected request to timeout')
    } catch (error) {
      expect(isLylaError(error)).toBe(true)
      if (isLylaError(error)) {
        expect(error.type).toBe(LYLA_ERROR.TIMEOUT)
      }
    }
  })
})
