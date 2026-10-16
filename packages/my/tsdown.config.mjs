import { transformSync } from '@babel/core'
import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'cjs',
  outDir: 'dist',
  fixedExtension: false,
  dts: false,
  clean: true,
  target: 'es2015',
  deps: {
    alwaysBundle: ['@lylajs/core']
  },
  inputOptions: {
    resolve: {
      mainFields: ['module', 'main']
    }
  },
  outputOptions: {
    generatedCode: {
      symbols: false
    }
  },
  plugins: [
    {
      // Rolldown can't output ES5. Code transformed in `renderChunk` would be
      // printed again by rolldown, so it's transformed in `generateBundle`.
      name: 'babel-es5',
      generateBundle(_, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type !== 'chunk') continue
          chunk.code = transformSync(chunk.code, {
            configFile: false,
            babelrc: false,
            sourceType: 'script',
            presets: [['@babel/preset-env', { targets: { ie: '11' } }]]
          }).code
        }
      }
    }
  ]
})
