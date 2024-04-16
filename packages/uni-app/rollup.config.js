import typescript from '@rollup/plugin-typescript'
import nodeResolve from '@rollup/plugin-node-resolve'
import getBabelOutputPlugin from '@rollup/plugin-babel'

const es5Config = {
  input: 'src/index.ts',
  output: [
    {
      dir: 'dist',
      format: 'cjs'
    }
  ],
  plugins: [
    typescript({ tsconfig: 'tsconfig.es5.json' }),
    nodeResolve(),
    getBabelOutputPlugin({
      babelHelpers: 'bundled',
      presets: ['@babel/preset-env']
    })
  ]
}

export default [es5Config]
