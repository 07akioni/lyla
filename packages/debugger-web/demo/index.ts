import { lyla as _lyla, LylaAdapterMeta } from '@lylajs/web'
import { createLylaDebugger } from '../src'

const { mount, lylaOptions } = createLylaDebugger<LylaAdapterMeta>()
const lyla = _lyla.extend(lylaOptions)

setTimeout(() => {
  mount(document.querySelector('#lyla')!)
}, 3000)

document.querySelector('#button1')!.addEventListener('click', () => {
  lyla
    .get('/api/get', {
      headers: {
        foo: 'bar',
        key: 'gigigi'
      }
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
