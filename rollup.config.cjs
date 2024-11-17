const babel = require('@rollup/plugin-babel');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const { dts } = require('rollup-plugin-dts');
const { readFileSync } = require('fs');

const pkg = JSON.parse(readFileSync('./package.json'));

const input = 'lib/axcache.js';
const extensions = ['.js', '.ts'];

const banner = `/*!
 * axcache v${pkg.version}
 * (c) ${new Date().getFullYear()} ${pkg.author}
 * Released under the ${pkg.license} License
 */`;

module.exports = [
  {
    input,
    output: [
      {
        file: './dist/axcache.cjs.js',
        format: 'cjs',
        banner,
        exports: 'named'
      },
      {
        file: './dist/axcache.esm.js',
        format: 'es',
        banner,
        exports: 'named'
      }
    ],
    plugins: [
      resolve({
        extensions,
        preferBuiltins: true
      }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**'
      })
    ],
    external: ['axios']
  },
  {
    input,
    output: {
      file: './dist/axcache.browser.esm.js',
      format: 'es',
      banner,
      exports: 'named'
    },
    plugins: [
      resolve({
        extensions,
        browser: true
      }),
      commonjs(),
      babel({
        babelHelpers: 'bundled',
        exclude: 'node_modules/**'
      })
    ],
    external: ['axios']
  },
  {
    input: './lib/types/index.d.ts',
    output: {
      file: './dist/types/index.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
];
