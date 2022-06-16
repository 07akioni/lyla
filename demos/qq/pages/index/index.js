const { lyla } = require('../../lib/@lylajs/qq/lib/index.js')

Page({
  data: {
    respBody: '请求中'
  },
  onLoad: function () {
    lyla.get('https://www.baidu.com')
  },
})
