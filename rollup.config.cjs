const babel = require('@rollup/plugin-babel');
const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const terser = require('@rollup/plugin-terser');
const { readFileSync } = require('fs');

const pkg = JSON.parse(readFileSync('./package.json'));

const input = 'lib/axcache.js';
const extensions = ['.js'];

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
        file: 'dist/axcache.cjs.js',
        format: 'cjs',
        banner,
        exports: 'named'
      },
      {
        file: 'dist/axcache.esm.js',
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
    external: ['axios', 'crypto']
  }
];
