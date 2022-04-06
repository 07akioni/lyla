/**
 * @type {import('rollup').RollupOptions}
 */
const options = {
  input: 'es/index.js',
  output: [
    {
      name: 'lyla',
      file: 'umd/lyla.js',
      format: 'umd'
    }
  ]
}

export default options
