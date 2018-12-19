import { DEFAULT_EXTENSIONS } from '@babel/core'
import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import filesize from 'rollup-plugin-filesize'
import nodeResolve from 'rollup-plugin-node-resolve'
import replace from 'rollup-plugin-replace'
import sourcemaps from 'rollup-plugin-sourcemaps'
import { uglify } from 'rollup-plugin-uglify'
import pkg from './package.json'

const CJS_DEV = 'CJS_DEV'
const CJS_PROD = 'CJS_PROD'
const ES = 'ES'
const UMD_DEV = 'UMD_DEV'
const UMD_PROD = 'UMD_PROD'

const input = './src/index.tsx'

const getGlobals = bundleType => {
  const baseGlobals = {
    'react-dom': 'ReactDOM',
    react: 'React'
  }

  switch (bundleType) {
    case UMD_DEV:
      return { ...baseGlobals, 'prop-types': 'PropTypes' }
    case UMD_PROD:
      return baseGlobals
    default:
      return {}
  }
}

const getExternal = bundleType => {
  const peerDependencies = Object.keys(pkg.peerDependencies)
  const dependencies = Object.keys(pkg.dependencies)

  // Hat-tip: https://github.com/rollup/rollup-plugin-babel/issues/148#issuecomment-399696316.
  const makeExternalPredicate = externals => {
    if (externals.length === 0) {
      return () => false
    }
    const pattern = new RegExp(`^(${externals.join('|')})($|/)`)
    return id => pattern.test(id)
  }

  switch (bundleType) {
    case CJS_DEV:
    case CJS_PROD:
    case ES:
      return makeExternalPredicate([...peerDependencies, ...dependencies])
    case UMD_DEV:
      return makeExternalPredicate([...peerDependencies, 'prop-types'])
    default:
      return makeExternalPredicate(peerDependencies)
  }
}

const isProduction = bundleType =>
  bundleType === CJS_PROD || bundleType === UMD_PROD

const getBabelConfig = bundleType => {
  const options = {
    babelrc: false,
    exclude: 'node_modules/**',
    presets: [
      ['@babel/env', { loose: true, modules: false }],
      '@babel/react',
      '@babel/typescript'
    ],
    plugins: [
      ['@babel/proposal-class-properties', { loose: true }],
      '@babel/transform-runtime'
    ],
    runtimeHelpers: true,
    extensions: [...DEFAULT_EXTENSIONS, '.ts', '.tsx']
  }

  switch (bundleType) {
    case ES:
      return {
        ...options,
        plugins: [
          ...options.plugins,
          ['transform-react-remove-prop-types', { mode: 'wrap' }]
        ]
      }
    case UMD_PROD:
    case CJS_PROD:
      return {
        ...options,
        plugins: [
          ...options.plugins,
          ['transform-react-remove-prop-types', { removeImport: true }]
        ]
      }
    default:
      return options
  }
}

const getPlugins = bundleType => [
  nodeResolve({
    extensions: ['.js', '.ts', '.tsx']
  }),
  commonjs({
    include: 'node_modules/**',
    namedExports: {
      'node_modules/prop-types/index.js': [
        'any',
        'array',
        'arrayOf',
        'bool',
        'element',
        'exact',
        'func',
        'instanceOf',
        'node',
        'number',
        'object',
        'objectOf',
        'oneOf',
        'oneOfType',
        'shape',
        'string',
        'symbol'
      ]
    }
  }),
  babel(getBabelConfig(bundleType)),
  bundleType !== ES &&
    replace({
      'process.env.NODE_ENV': JSON.stringify(
        isProduction(bundleType) ? 'production' : 'development'
      )
    }),
  sourcemaps(),
  ...(isProduction(bundleType) ? [uglify(), filesize()] : [])
]

const getCjsConfig = bundleType => ({
  input,
  external: getExternal(bundleType),
  output: {
    file: `cjs/react-input-extras.${
      isProduction(bundleType) ? 'production.min' : 'development'
    }.js`,
    format: 'cjs',
    sourcemap: true
  },
  plugins: getPlugins(bundleType)
})

const getEsConfig = () => ({
  input,
  external: getExternal(ES),
  output: {
    file: pkg.module,
    format: 'es',
    sourcemap: true
  },
  plugins: getPlugins(ES)
})

const getUmdConfig = bundleType => ({
  input,
  external: getExternal(bundleType),
  output: {
    file: `umd/react-input-extras.${
      isProduction(bundleType) ? 'production.min' : 'development'
    }.js`,
    format: 'umd',
    globals: getGlobals(bundleType),
    name: '',
    sourcemap: true
  },
  plugins: getPlugins(bundleType)
})

export default [
  getCjsConfig(CJS_DEV),
  getCjsConfig(CJS_PROD),
  getEsConfig(),
  getUmdConfig(UMD_DEV),
  getUmdConfig(UMD_PROD)
]
