import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'node_modules/@lylajs/web/es/index.js',
    'browser-targets': 'fixtures/browser-targets.ts',
    'web-xhr': 'node_modules/@lylajs/web-xhr/es/index.js',
    'web-fetch': 'node_modules/@lylajs/web-fetch/es/index.js'
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
    alwaysBundle: ['@lylajs/core', '@lylajs/web-xhr', '@lylajs/web-fetch']
  },
  inputOptions: {
    resolve: {
      mainFields: ['module', 'main']
    }
  }
})
