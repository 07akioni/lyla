import { createLyla, mergeOptions } from '@lylajs/web'
import { createLylaDebugger } from '../src'

type CustomContext = { id: string; foo: string }
const { mount, lylaOptions } = createLylaDebugger<CustomContext>()
const { lyla } = createLyla<CustomContext>({
  ...mergeOptions(lylaOptions, {
    baseUrl: '/foo'
  }),
  context: {
    id: 'unset',
    foo: 'unset'
  }
})

setTimeout(() => {
  mount(document.querySelector('#lyla')!)
  // const { unmount } = mount(document.querySelector('#lyla')!)
  // setTimeout(() => {
  //   unmount()
  // }, 3000)
}, 1000)

document.querySelector('#button1')!.addEventListener('click', () => {
  lyla
    .get('/api/get', {
      headers: {
        foo: 'bar',
        key: 'gigigi'
      }
      // json: {
      //   string: 'string',
      //   number: 123,
      //   null: null,
      //   undefined: undefined,
      //   boolean1: true,
      //   boolean2: false
      // }
    })
    .catch((e: unknown) => {
      console.log(e)
    })
})

document.querySelector('#button4')!.addEventListener('click', () => {
  lyla
    .post('/api/get-non-json', {
      headers: {
        foo: 'bar',
        key: 'gigigi'
      },
      body: 'hfeiawiuhbhjiuwefiuhawfiewu'
    })
    .catch((e: unknown) => {
      console.log(e)
    })
})

document.querySelector('#button3')!.addEventListener('click', () => {
  lyla
    .get('/api/get-null', {
      headers: {
        foo: 'bar',
        key: 'gigigi'
      }
    })
    .catch((e: unknown) => {
      console.log(e)
    })
})

document.querySelector('#button2')!.addEventListener('click', () => {
  lyla
    .post('/api/mget', {
      headers: {
        foo: 'bar',
        key: 'gigigi'
      }
    })
    .catch((e: unknown) => {
      console.log(e)
    })
})
