import axios from 'axios'
import { lyla, catchError } from '../src'

const request = lyla.extend({ baseUrl: '/api/' })

type Handler = [string, () => void]

const handlers: Handler[] = [
  [
    'res-text (responseType text)',
    () => {
      request
        .get('res-text', {
          responseType: 'text'
        })
        .then(({ body }) => {
          console.log(body)
        })
    }
  ],
  [
    'req-text-res-text (responseType json)',
    () => {
      request({
        method: 'GET',
        url: 'res-text'
      }).then(({ body }) => {
        console.log(body)
      })
      axios
        .get('http://localhost:7070', {
          baseURL: 'http://localhost:3000',
          responseType: 'json'
        })
        .then((resp) => {
          console.log(resp.data)
        })
      fetch('/api/res-text', {
        method: 'GET'
      })
        .then((resp) => {
          return resp.json()
        })
        .then((data) => {
          console.log('fetch', data)
        })
    }
  ],
  [
    'res-text (responseType blob)',
    () => {
      request({
        method: 'GET',
        url: 'res-text',
        responseType: 'blob'
      }).then(({ body }) => {
        console.log(body)
      })
    }
  ],
  [
    'res-text (responseType array buffer)',
    () => {
      request({
        method: 'GET',
        url: 'res-text',
        responseType: 'arraybuffer'
      }).then(({ body }) => {
        console.log(body)
      })
    }
  ],
  [
    'req-json-res-text (responseType json)',
    () => {
      request({
        method: 'GET',
        url: 'res-text',
        json: {
          jsonKey: 'jsonValue'
        }
      }).then(({ body }) => {
        console.log(body)
      })
    }
  ],
  [
    'req-json-res-json (responseType json)',
    () => {
      request({
        method: 'GET',
        url: 'res-json',
        json: {
          jsonKey: 'jsonValue'
        }
      }).then(({ body }) => {
        console.log(body)
      })
      // axios.get("/api/res-json").then((resp) => {
      //   console.log("axios", resp.data);
      // });
      // fetch("/api/res-json", {
      //   method: "GET",
      // })
      //   .then((resp) => {
      //     return resp.json();
      //   })
      //   .then((data) => {
      //     console.log("fetch", data);
      //   });
    }
  ],
  [
    'post-req-json-res-json (responseType json)',
    () => {
      request({
        method: 'POST',
        url: 'res-json',
        json: {
          jsonKey: 'jsonValue'
        }
      }).then(({ body }) => {
        console.log(body)
      })
      // axios.get("/api/res-json").then((resp) => {
      //   console.log("axios", resp.data);
      // });
      // fetch("/api/res-json", {
      //   method: "GET",
      // })
      //   .then((resp) => {
      //     return resp.json();
      //   })
      //   .then((data) => {
      //     console.log("fetch", data);
      //   });
    }
  ],
  [
    'req-text-res-json-content-type-json (responseType json)',
    () => {
      request({
        method: 'GET',
        url: 'res-json-content-type-json'
      }).then(({ body }) => {
        console.log(body)
      })
      axios.get('/api/res-json-content-type-json').then((resp) => {
        console.log('axios', resp.data)
      })
    }
  ],
  [
    'req-text-res-json-content-type-json (responseType text)',
    () => {
      request({
        method: 'GET',
        url: 'res-json-content-type-json',
        responseType: 'text'
      }).then(({ json }) => {
        console.log(json)
      })
      axios
        .get('/api/res-json-content-type-json', { responseType: 'text' })
        .then((resp) => {
          console.log('axios text', resp.data)
        })
    }
  ],
  [
    '404',
    () => {
      request({
        method: 'GET',
        url: 'not-found'
      })
        .then(({ body }) => {
          console.log(body)
        })
        .catch(
          catchError((e) => {
            if (e.lylaError) {
              console.log(e.lylaError)
            } else {
              console.error(e.error)
            }
          })
        )
    }
  ],
  [
    'hooks',
    () => {
      const _req = request.extend({
        hooks: {
          onBeforeOptionsNormalized: [
            (options) => {
              if (options.url === '/gigigi') {
                options.url = '/post-return-body'
              }
              return options
            }
          ],
          onBeforeRequest: [
            (options) => {
              options.json = { foo: 'bar' }
              return options
            }
          ],
          onAfterResponse: [
            (resp) => {
              debugger
              if (
                '{"foo":"bar"}' === (resp.body as string).replace(/\s\n/g, '')
              ) {
                resp.body = 'jojo'
              }
              return resp
            }
          ]
        }
      })
      _req.post('/gigigi').then((resp) => {
        console.log(resp)
      })
    }
  ],
  [
    'cors set cookie',
    async () => {
      const resp = await lyla.get('http://localhost:7070/api/get-set-cookie', {
        withCredentials: true
      })
      console.log(resp)
    }
  ],
  [
    'cors get with credentials',
    async () => {
      const resp = await lyla.get(
        'http://localhost:7070/api/get-return-headers',
        { withCredentials: true }
      )
      console.log(resp)
    }
  ],
  [
    'cors get without credentials',
    async () => {
      const resp = await lyla.get(
        'http://localhost:7070/api/get-return-headers'
      )
      console.log(resp)
    }
  ],
  [
    'cors post cookie',
    async () => {
      const resp = await lyla.post(
        'http://localhost:7070/api/post-set-cookie',
        { withCredentials: true }
      )
      console.log(resp)
    }
  ],
  [
    'cors post with credentials',
    async () => {
      const resp = await lyla.post(
        'http://localhost:7070/api/post-return-headers',
        { withCredentials: true }
      )
      console.log(resp)
    }
  ],
  [
    'cors post without credentials',
    async () => {
      const resp = await lyla.post(
        'http://localhost:7070/api/post-return-headers'
      )
      console.log(resp)
    }
  ],
  [
    'progress',
    async () => {
      request.post('/post-return-body', {
        responseType: 'text',
        body: Array(50000).fill('xxxxxxxxxx').join(''),
        onUploadProgress(e) {
          console.log('u', e.loaded / e.total)
        },
        onDownloadProgress(e) {
          console.log('d', e.lengthComputable, e.loaded / e.total)
        }
      })
    }
  ],
  [
    'test',
    async () => {
      try {
        await lyla.get('http://localhost:7070/api/get-check-cookie')
      } catch (e) {
        debugger
      }
    }
  ],
  [
    'set json',
    async () =>  {
      const resp = await lyla.get('/api/get-text', {
        responseType: 'arraybuffer'
      })
      resp.json = 'resp json'
      console.log(resp.json)
    }
  ]
]

handlers.forEach(([selector, handler]) => {
  const button = document.createElement('button')
  button.id = selector
  button.textContent = selector
  button.style.margin = '0 12px 8px 0'
  document.body.appendChild(button)
  button.addEventListener('click', handler)
})
