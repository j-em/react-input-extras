'use strict'

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./cjs/react-input-extras.production.min.js')
} else {
  module.exports = require('./cjs/react-input-extras.development.js')
}
