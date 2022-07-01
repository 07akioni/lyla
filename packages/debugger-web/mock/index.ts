import { MockMethod } from 'vite-plugin-mock'

const mocks: MockMethod[] = [
  {
    url: '/api/get',
    method: 'get',
    response: () => {
      return {
        code: 0,
        data: {
          string: 'string',
          number: 123,
          null: null,
          undefined: undefined,
          boolean1: true,
          boolean2: false
        }
      }
    }
  },
  {
    url: '/api/get-null',
    method: 'get',
    response: () => {
      return null
    }
  }
]

export default mocks
