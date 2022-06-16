const { lyla } = require('../../lib/@lylajs/qq/lib/index.js')

Page({
  data: {
    respBody: '请求中'
  },
  onLoad: function () {
    lyla.get('https://randomuser.me/api/', {
      headers: {
        foo: 'bar'
      }
    }).then(resp => {
      console.log(resp)
      console.log(resp.json)
    })
    lyla.get('https://www.baidu.com').then(resp => {
      console.log(resp.body)
    })
  },
})
