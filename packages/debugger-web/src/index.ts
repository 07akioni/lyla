import { h, render, VNode } from 'preact'
import { useState, useMemo, useRef, useLayoutEffect } from 'preact/hooks'
import type { LylaRequestOptions, LylaAdapterMeta } from '@lylajs/core'

const saveData = (data: string, fileName: string) => {
  const a = document.createElement('a')
  document.body.appendChild(a)
  a.style.cssText = 'display: none'
  const blob = new Blob([data], { type: 'octet/stream' })
  const url = window.URL.createObjectURL(blob)
  a.href = url
  a.download = fileName
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

function formatDate(date: Date) {
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`
}

function JsonView({
  json,
  unwrapJsonString,
  inArray = false,
  level = 0
}: {
  json: Record<string, any> | string | number | undefined | null | boolean
  unwrapJsonString: boolean
  inArray?: boolean
  level?: number
}): VNode | null {
  if (json === undefined) return null
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  let indent = ''
  for (let i = 0; i < level; ++i) {
    indent += '  '
  }
  if (json && typeof json === 'object') {
    if (Array.isArray(json)) {
      return h(level === 0 ? 'pre' : 'span', { style: { margin: 0 } }, [
        (inArray ? indent : '') + '[\n',
        json.map((v, index) => {
          return [
            h(JsonView, {
              json: v,
              unwrapJsonString,
              inArray: true,
              level: level + 1
            }),
            json.length === index + 1 ? '\n' : ',\n'
          ]
        }),
        indent + ']'
      ])
    } else {
      const keys = Object.keys(json)
      return h(level === 0 ? 'pre' : 'span', { style: { margin: 0 } }, [
        (inArray ? indent : '') + '{\n',
        keys.map((key, index) => {
          const isLast: boolean = index === keys.length - 1
          let value: any = json[key]
          let type = typeof value
          const valueIsJsonObjectString =
            type === 'string' && /^(\[|\{)/.test(value)
          const valueIsObject = value && type === 'object'

          if (valueIsJsonObjectString) {
            value = JSON.parse(value)
          }

          if (
            expandedKeys.includes(key) ||
            !(valueIsObject || valueIsJsonObjectString)
          ) {
            return [
              indent,
              '  ',
              h(
                'span',
                {
                  style:
                    valueIsObject || valueIsJsonObjectString
                      ? {
                          cursor: 'pointer'
                        }
                      : undefined,
                  onClick:
                    valueIsObject || valueIsJsonObjectString
                      ? () => {
                          setExpandedKeys(
                            expandedKeys.filter(
                              (expandedKey) => expandedKey !== key
                            )
                          )
                        }
                      : undefined
                },
                [key]
              ),
              valueIsJsonObjectString ? ' (JSON String)' : null,
              ': ',
              h(JsonView, { json: value, unwrapJsonString, level: level + 1 }),
              isLast ? null : ',',
              '\n'
            ]
          }
          return h(
            'span',
            {
              style: {
                cursor: 'pointer'
              },
              onClick: () => {
                setExpandedKeys(expandedKeys.concat(key))
              }
            },
            [indent, '  ', key, ': ...', isLast ? null : ',', '\n']
          )
        }),
        indent + '}'
      ])
    }
  } else {
    return h('span', null, [
      inArray ? indent : null,
      `${typeof json === 'string' ? `"${json}"` : json}`
    ])
  }
}

export type DebuggerRequest = {
  id: string
  url: string
  method: string
  headers: Record<string, any> | undefined
  json:
    | Record<string, any>
    | Array<any>
    | string
    | number
    | undefined
    | null
    | boolean
  timestamp: number
  time: string
  state: 'PENDING' | 'OK' | 'ERROR' | 'ERROR_WITHOUT_RESPONSE'
  response?: DebuggerResponse
}

export type DebuggerResponse = {
  id: string
  status: string
  timestamp: number
  time: string
  headers: Record<string, any> | undefined
  json: string | undefined
}

export function createLylaDebugger<
  M extends LylaAdapterMeta = LylaAdapterMeta
>({
  capacity,
  thiryPartySetup
}: {
  capacity?: number
  thiryPartySetup?: (
    setRequests: (
      updater: (
        prevRequests: DebuggerRequest[],
        extra: {
          timestamp: number
          time: string
        }
      ) => DebuggerRequest[]
    ) => void
  ) => void
} = {}): {
  lylaOptions: LylaRequestOptions<M>
  mount: (el: HTMLElement) => {
    unmount: () => void
  }
} {
  let requestsBeforeMount: DebuggerRequest[] = []
  let _setRequests: (
    updater: (prevState: DebuggerRequest[]) => DebuggerRequest[]
  ) => void = (updater) => {
    requestsBeforeMount = updater(requestsBeforeMount)
  }
  const trimByCapacityOrCreateANewArray = (
    v: DebuggerRequest[]
  ): DebuggerRequest[] => {
    if (capacity === undefined || v.length > capacity) {
      return Array.from(v)
    } else {
      return v.slice(v.length - capacity, v.length)
    }
  }

  // Allow thiry party setup
  if (thiryPartySetup) {
    thiryPartySetup(
      (
        updater: (
          prevState: DebuggerRequest[],
          extra: {
            timestamp: number
            time: string
          }
        ) => DebuggerRequest[]
      ) => {
        _setRequests((prevState) => {
          const now = new Date()
          return trimByCapacityOrCreateANewArray(
            updater(prevState, {
              timestamp: now.valueOf(),
              time: formatDate(now)
            })
          )
        })
      }
    )
  }

  const options: LylaRequestOptions<M> = {
    hooks: {
      onBeforeRequest: [
        (requestOptions, id) => {
          _setRequests((requests) => {
            const now = new Date()
            requests.push({
              id,
              url: requestOptions.url || '',
              method: requestOptions.method || '',
              headers: requestOptions.headers,
              json: requestOptions.json,
              timestamp: now.valueOf(),
              time: formatDate(now),
              response: undefined,
              state: 'PENDING'
            })
            return trimByCapacityOrCreateANewArray(requests)
          })
          return requestOptions
        }
      ],
      onAfterResponse: [
        (response, id) => {
          _setRequests((requests) => {
            for (const request of requests) {
              if (request.id === id) {
                const now = new Date()
                request.state = 'OK'
                request.response = {
                  id,
                  timestamp: now.valueOf(),
                  time: formatDate(now),
                  status: `${response.status}`,
                  headers: response.headers,
                  json: response.json
                }
                break
              }
            }
            return trimByCapacityOrCreateANewArray(requests)
          })
          return response
        }
      ],
      onResponseError: [
        (e, id) => {
          const { response } = e
          _setRequests((requests) => {
            for (const request of requests) {
              if (request.id === id) {
                if (response) {
                  const now = new Date()
                  request.state = 'ERROR'
                  request.response = {
                    id,
                    status: `${response.status}`,
                    headers: response.headers,
                    json: response.json,
                    timestamp: now.valueOf(),
                    time: formatDate(now)
                  }
                } else {
                  request.state = 'ERROR_WITHOUT_RESPONSE'
                }
                break
              }
            }
            return trimByCapacityOrCreateANewArray(requests)
          })
          return response
        }
      ]
    }
  }

  function LylaDebugger() {
    const [requests, setRequests] =
      useState<DebuggerRequest[]>(requestsBeforeMount)
    const latestId = requests[requests.length - 1]?.id
    const [activeRequest, setActiveRequest] = useState<DebuggerRequest | null>(
      null
    )
    const [minify, setMinify] = useState(true)
    if (_setRequests !== setRequests) {
      _setRequests = setRequests
      requestsBeforeMount = [] // release memo
    }
    const requestListRef = useRef<HTMLElement | null>(null)
    const isAtBottomRef = useRef(true)
    useMemo(() => {
      const requestListEl = requestListRef.current
      if (!requestListEl) return
      isAtBottomRef.current =
        requestListEl.scrollTop + requestListEl.offsetHeight >=
        requestListEl.scrollHeight
    }, [requests])
    useLayoutEffect(() => {
      const requestListEl = requestListRef.current
      if (!requestListEl) return
      if (isAtBottomRef.current) {
        requestListEl.scrollTop = requestListEl.scrollHeight
      }
    }, [requests])
    return h(
      'div',
      {
        style: {
          zIndex: '9999',
          fontFamily: 'Courier',
          position: 'fixed',
          background: '#fff',
          right: '16px',
          left: minify ? undefined : '16px',
          bottom: '16px',
          border: '1px solid #eee',
          borderRadius: '4px',
          boxShadow: '0 4px 8px 2px rgba(0, 0, 0, .08)'
        }
      },
      [
        h(
          'div',
          {
            style: {
              fontSize: '16px',
              lineHeight: '24px',
              padding: '12px 16px',
              boxSizing: 'border-box',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between'
            }
          },
          [
            h('span', null, [
              'Lyla Debugger',
              minify
                ? null
                : [
                    ' ',
                    h(
                      'span',
                      {
                        style: {
                          fontSize: '14px',
                          cursor: 'pointer'
                        },
                        onClick: () => {
                          setRequests([])
                          setActiveRequest(null)
                        }
                      },
                      ['[Clear]']
                    )
                  ]
            ]),
            minify ? `[LatestID=${latestId ?? '*'}]` : null,
            h(
              'span',
              {
                style: {
                  cursor: 'pointer'
                },
                onClick: () => {
                  setMinify((value) => !value)
                }
              },
              [minify ? '[+]' : '[-]']
            )
          ]
        ),
        !minify &&
          h(
            'div',
            {
              ref: requestListRef as any,
              style: {
                padding: '12px 16px',
                fontSize: '14px',
                lineHeight: '20px',
                overflow: 'auto',
                boxSizing: 'border-box',
                maxHeight: '264px'
              }
            },
            requests.length
              ? requests.map((request) => {
                  return h(
                    'div',
                    {
                      style: {
                        display: 'flex',
                        cursor: 'pointer',
                        wordBreak: 'break-word'
                      },
                      onClick: () => {
                        setActiveRequest(request)
                      }
                    },
                    [
                      h(
                        'div',
                        {
                          style: {
                            boxSizing: 'border-box',
                            width: '10%'
                          }
                        },
                        [request.id]
                      ),
                      h(
                        'div',
                        {
                          style: {
                            width: '45%'
                          }
                        },
                        [request.url]
                      ),
                      h(
                        'div',
                        {
                          style: {
                            width: '10%'
                          }
                        },
                        [request.method]
                      ),
                      h(
                        'div',
                        {
                          style: {
                            width: '10%'
                          }
                        },
                        [request.response?.status || '-']
                      ),
                      h(
                        'div',
                        {
                          style: {
                            width: '25%'
                          }
                        },
                        [request.time]
                      )
                    ]
                  )
                })
              : [
                  h(
                    'span',
                    {
                      style: {
                        color: '#999'
                      }
                    },
                    ['None']
                  )
                ]
          ),
        !minify && activeRequest
          ? h(
              'div',
              {
                style: {
                  padding: '12px 16px',
                  fontSize: '14px',
                  lineHeight: '20px',
                  overflow: 'auto',
                  maxHeight: '50vh',
                  borderTop: '1px solid #eee'
                }
              },
              [
                h(LylaDetailPanel, {
                  key: activeRequest.id,
                  request: activeRequest,
                  status: activeRequest.state
                })
              ]
            )
          : null
      ]
    )
  }

  function LylaDetailPanel({ request }: { request: DebuggerRequest }) {
    const [mode, setMode] = useState<'request' | 'response'>('request')
    const modeIsRequest = mode === 'request'
    const headers = modeIsRequest ? request.headers : request.response?.headers
    const body = modeIsRequest ? request.json : request.response?.json
    const responseAvailable =
      request.state !== 'ERROR_WITHOUT_RESPONSE' && request.response
    return h('div', null, [
      h(
        'pre',
        { style: { margin: 0 } },
        [
          request.id,
          request.url,
          request.method,
          request.response?.status,
          request.response
            ? `${request.response.timestamp - request.timestamp}ms`
            : undefined
        ]
          .filter((v) => v !== undefined)
          .join(' ')
      ),
      h('br', null),
      h('pre', { style: { margin: 0 } }, [
        h(
          'span',
          {
            style: {
              cursor: modeIsRequest ? 'default' : 'pointer',
              textDecoration: modeIsRequest ? 'underline' : undefined
            },
            onClick: () => {
              setMode('request')
            }
          },
          ['Request']
        ),
        ' ',
        h(
          'span',
          {
            style: {
              color: responseAvailable ? undefined : '#999',
              cursor: responseAvailable ? 'pointer' : 'not-allowed',
              textDecoration: !modeIsRequest ? 'underline' : undefined
            },
            onClick: responseAvailable
              ? () => {
                  setMode('response')
                }
              : undefined
          },
          [
            'Response',
            request.state === 'ERROR_WITHOUT_RESPONSE'
              ? ' (Unavailable)'
              : request.response
              ? null
              : ' (Waiting)'
          ]
        )
      ]),
      h('pre', { key: mode, style: { margin: 0 } }, [
        !modeIsRequest && [
          '\n',
          h(
            'span',
            {
              style: {
                cursor: 'pointer'
              },
              onClick: () => {
                saveData(JSON.stringify(body, null, 2), `${request.id}.json`)
              }
            },
            ['Download Body']
          ),
          '\n'
        ],
        '\n',
        '[Headers]\n',
        headers
          ? Object.entries(headers).map(([key, value]) => {
              return `${key}: ${value}\n`
            })
          : 'None\n',
        '\n',
        '[Body]'
      ]),
      h(JsonView, {
        json: body,
        unwrapJsonString: true
      })
    ])
  }

  return {
    mount: (el) => {
      render(h(LylaDebugger, null), el)
      return {
        unmount: () => {
          render(null, el)
        }
      }
    },
    lylaOptions: options
  }
}
