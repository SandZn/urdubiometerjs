/* eslint-env es6 */

'use strict'

const path = require('path')

const serverConfig = {
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'urdubiometer.node.js'
  },
  mode: 'production'

}

const clientConfig = {
  target: 'web', // <=== can be omitted as default is 'web'
  mode: 'production',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'urdubiometer.js',
    library: 'UrduBioMeter'

  },
  node: {
    global: true
  }

}

module.exports = [
  serverConfig,
  clientConfig

]
