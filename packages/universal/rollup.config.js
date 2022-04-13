import typescript from '@rollup/plugin-typescript'
import nodeResolve from '@rollup/plugin-node-resolve'

/**
 * @type {import('rollup').RollupOptions}
 */
const esmConfig = {
  input: 'src/index.ts',
  output: [
    {
      dir: 'es',
      format: 'esm'
    }
  ],
  plugins: [typescript({ tsconfig: 'tsconfig.esm.json' }), nodeResolve()]
}

const cjsConfig = {
  input: 'src/index.ts',
  output: [
    {
      dir: 'lib',
      format: 'cjs'
    }
  ],
  plugins: [typescript({ tsconfig: 'tsconfig.cjs.json' }), nodeResolve()]
}

export default [esmConfig, cjsConfig]
