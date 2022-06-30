import { UserConfigExport, ConfigEnv } from 'vite'
import { viteMockServe } from 'vite-plugin-mock'

export default ({ command }: ConfigEnv): UserConfigExport => {
  return {
    plugins: [
      viteMockServe({
        mockPath: 'mock',
        localEnabled: command === 'serve'
      })
    ]
  }
}
