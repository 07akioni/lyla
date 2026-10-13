import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'node_modules/@lylajs/web/es/index.js'
  },
  format: 'esm',
  outDir: 'es',
  platform: 'browser',
  fixedExtension: false,
  outExtensions() {
    return { js: '.js' }
  },
  dts: false,
  clean: true,
  deps: {
    alwaysBundle: ['@lylajs/core']
  },
  inputOptions: {
    resolve: {
      mainFields: ['module', 'main']
    }
  }
})
