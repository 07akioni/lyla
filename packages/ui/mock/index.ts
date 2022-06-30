import { MockMethod } from 'vite-plugin-mock'

const mocks: MockMethod[] = [
  {
    url: '/api/get',
    method: 'get',
    response: () => {
      return {
        code: 0,
        data: {
          name: 'vben'
        }
      }
    }
  }
]

export default mocks
