import { lyla as _lyla, LylaAdapterMeta } from '@lylajs/web'
import { createLylaUi } from '../src'

const { mount, lylaOptions } = createLylaUi<LylaAdapterMeta>()
const lyla = _lyla.extend(lylaOptions)

mount(document.querySelector('#lyla')!)

document.querySelector('#button1')!.addEventListener('click', () => {
  lyla
    .get('/api/get', {
      headers: {
        foo: 'bar',
        key: 'gigigi'
      }
    })
    .catch((e) => {
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
    .catch((e) => {
      console.log(e)
    })
})
