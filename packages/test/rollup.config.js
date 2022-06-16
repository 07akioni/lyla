import nodeResolve from '@rollup/plugin-node-resolve'

/**
 * @type {import('rollup').RollupOptions}
 */
export default {
  input: 'node_modules/@lylajs/web/es/index.js',
  output: [
    {
      dir: 'es',
      format: 'esm'
    }
  ],
  plugins: [nodeResolve()]
}
