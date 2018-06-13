/* eslint-env es6 */

'use strict'

const path = require('path')

module.exports = {
  entry: './src/index.js',
  mode: 'production',
  devtool: 'source-map',
  output: {
    filename: 'urdubiometer.js',
    path: path.resolve(__dirname, 'dist')
  }
}
