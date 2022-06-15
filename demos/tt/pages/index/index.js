import { lyla } from '../../../es/index'

Page({
  data: {
    respBody: 'wait for response'
  },
  onLoad: function () {
    lyla.get('www.baidu.com').then((resp) => {
      console.log(resp.body)
      this.setData({
        respBody: resp.body
      })
    })
  }
})
