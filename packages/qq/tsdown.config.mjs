import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'cjs',
  outDir: 'dist',
  fixedExtension: false,
  dts: false,
  clean: true,
  target: 'es2017',
  deps: {
    alwaysBundle: ['@lylajs/core']
  },
  inputOptions: {
    resolve: {
      mainFields: ['module', 'main']
    }
  }
})
