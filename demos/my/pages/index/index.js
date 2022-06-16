import { lyla, catchError } from '@lylajs/my/dist'

Page({
  onLoad(query) {
    // 页面加载
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
    lyla.get('xxx').catch(catchError(({
      lylaError
    }) => {
      if (lylaError) {
        console.log('lylaError.detail', lylaError.detail)
      }
    }))
  },
  onReady() {
    // 页面加载完成
  },
  onShow() {
    // 页面显示
  },
  onHide() {
    // 页面隐藏
  },
  onUnload() {
    // 页面被关闭
  },
  onTitleClick() {
    // 标题被点击
  },
  onPullDownRefresh() {
    // 页面被下拉
  },
  onReachBottom() {
    // 页面被拉到底部
  },
  onShareAppMessage() {
    // 返回自定义分享信息
    return {
      title: 'My App',
      desc: 'My App description',
      path: 'pages/index/index',
    };
  },
});
