'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

// Keep the React 16 renderer fixture independent of the external element runtime.
// The override is a consumer directory containing node_modules/react, not a version.
module.exports = run
if (require.main === module) {
  if (process.env.STATUSBAR_TEST_MODE) run()
  else {
    const childProcess = require('child_process')
    for (const mode of ['development', 'production']) {
      const result = childProcess.spawnSync(process.execPath, [__filename], {
        env: Object.assign({}, process.env, { NODE_ENV: mode, STATUSBAR_TEST_MODE: mode }),
        stdio: 'inherit'
      })
      if (result.error) throw result.error
      assert.strictEqual(result.status, 0, mode + ' JSX tests failed')
    }
  }
}

function run () {
  assert(['development', 'production'].includes(process.env.NODE_ENV))
  const reactRuntime = process.env.STATUSBAR_TEST_REACT_RUNTIME
    ? path.resolve(process.env.STATUSBAR_TEST_REACT_RUNTIME)
    : __dirname
  const runtime = process.env.STATUSBAR_TEST_RUNTIME
    ? path.resolve(process.env.STATUSBAR_TEST_RUNTIME)
    : __dirname
  const React = require(require.resolve('react', { paths: [reactRuntime] }))
  const jsx = require(require.resolve('react/jsx-runtime', { paths: [reactRuntime] }))
  const jsxDEV = process.env.NODE_ENV === 'development'
    ? require(require.resolve('react/jsx-dev-runtime', { paths: [reactRuntime] }))
    : null
  const PropTypes = require(require.resolve('prop-types', { paths: [runtime] }))
  const Babel = require('@babel/standalone')
  const filename = path.resolve(process.env.STATUSBAR_TEST_SOURCE || path.join(__dirname, '..', 'index.js'))
  const source = fs.readFileSync(filename, 'utf8')
  const modes = [
    { name: 'classic', runtime: 'classic', development: false },
    { name: 'automatic', runtime: 'automatic', development: false }
  ]
  if (process.env.NODE_ENV === 'development') {
    modes.push({ name: 'automatic-dev', runtime: 'automatic', development: true })
  }
  let passed = 0

  function compile (code, mode, native) {
    const compiled = Babel.transform(code, {
      filename: filename,
      presets: [['react', { runtime: mode.runtime, development: mode.development }]],
      plugins: ['transform-modules-commonjs']
    }).code
    // These are actual Babel transforms and actual React JSX entry points.
    if (mode.runtime === 'automatic') {
      assert(compiled.includes(mode.development ? 'react/jsx-dev-runtime' : 'react/jsx-runtime'))
    } else assert(compiled.includes('createElement'))
    const imports = {
      react: React,
      'react/jsx-runtime': jsx,
      'react/jsx-dev-runtime': jsxDEV,
      'react-native': native,
      'prop-types': PropTypes
    }
    const exports = {}
    vm.runInThisContext('(function(require, exports) {\n' + compiled + '\n})', { filename: filename })(function (name) {
      assert(Object.prototype.hasOwnProperty.call(imports, name), 'Unexpected import: ' + name)
      return imports[name]
    }, exports)
    return exports
  }

  function capture (check) {
    const messages = []
    const original = console.error
    console.error = function () { messages.push(Array.from(arguments).join(' ')) }
    try { check() } finally { console.error = original }
    return messages
  }

  const callers = modes.map(function (mode) {
    return {
      name: mode.name,
      create: compile('import React from "react"; export default (Component, props) => <Component {...props} />', mode, {}).default
    }
  })

  for (const componentMode of modes) {
    for (const inherited of [false, true]) {
      const styleCalls = []
      const imperativeCalls = []
      function View () { throw new Error('Host rendering is outside this suite') }
      function NativeStatusBar () { throw new Error('Host rendering is outside this suite') }
      if (inherited) NativeStatusBar.propTypes = { nativeFlag: PropTypes.bool }
      for (const key of ['setBarStyle', 'setHidden', 'setBackgroundColor', 'setTranslucent']) {
        NativeStatusBar[key] = function () { imperativeCalls.push(key) }
      }
      const exports = compile(source, componentMode, {
        View: View,
        StatusBar: NativeStatusBar,
        StyleSheet: {
          create: function (styles) {
            Object.freeze(styles.StatusBar)
            Object.freeze(styles)
            styleCalls.push(styles)
            return styles
          }
        }
      })
      const StatusBar = exports.default
      const defaults = StatusBar.defaultProps

      for (const caller of callers) {
        function test (name, check, allowWarnings) {
          const messages = capture(check)
          if (allowWarnings) assert(messages.every(function (message) { return message.includes('Failed') && message.includes('type') }), messages.join('\n'))
          else assert.deepStrictEqual(messages, [])
          passed++
          console.log('ok - JSX - React ' + React.version + ' - ' + process.env.NODE_ENV + ' - component=' + componentMode.name + ' caller=' + caller.name + ' native propTypes=' + inherited + ' - ' + name)
        }
        function evaluate (props) {
          const element = caller.create(StatusBar, props)
          assert.strictEqual(element.type, StatusBar)
          // Both components are hook-free: evaluate their actual functions with
          // the props produced by React. This is not a reconciler/native test.
          const view = element.type(element.props)
          assert(React.isValidElement(view))
          assert.strictEqual(view.type, View)
          assert.deepStrictEqual(Object.keys(view.props).sort(), ['children', 'style'])
          const bar = view.props.children
          assert(React.isValidElement(bar))
          assert.strictEqual(bar.type, NativeStatusBar)
          assert.strictEqual(view.props.style.length, 3)
          assert.strictEqual(view.props.style[0], styleCalls[0].StatusBar)
          assert.strictEqual(bar.props.backgroundColor, 'transparent')
          for (const key of ['dark', 'style']) assert(!Object.prototype.hasOwnProperty.call(bar.props, key))
          return { view: view, bar: bar }
        }

        test('public metadata and existing self-spread are unchanged', function () {
          assert.deepStrictEqual(Object.keys(exports), ['default'])
          assert.deepStrictEqual(defaults, { dark: false, backgroundColor: 'rgba(0,0,0,0.2)', style: {} })
          assert.deepStrictEqual(StatusBar.propTypes, { style: PropTypes.object, dark: PropTypes.bool, backgroundColor: PropTypes.string })
          assert.strictEqual(StatusBar.propTypes.nativeFlag, undefined)
        })

        test('omitted and undefined props use the public defaults', function () {
          for (const props of [{}, { dark: undefined, backgroundColor: undefined, style: undefined }]) {
            const result = evaluate(Object.freeze(props))
            assert.strictEqual(result.view.props.style[1].backgroundColor, defaults.backgroundColor)
            assert.strictEqual(result.view.props.style[2], defaults.style)
            assert.deepStrictEqual(result.bar.props, { barStyle: 'light-content', translucent: true, backgroundColor: 'transparent' })
          }
        })

        test('explicit falsey values bypass defaults and preserve truthiness', function () {
          for (const value of [null, false, 0, '']) {
            const result = evaluate(Object.freeze({ dark: value, backgroundColor: value, style: value }))
            assert.strictEqual(result.view.props.style[1].backgroundColor, value)
            assert.strictEqual(result.view.props.style[2], value)
            assert.strictEqual(result.bar.props.barStyle, 'light-content')
          }
          for (const dark of [true, 1, 'yes']) assert.strictEqual(evaluate({ dark: dark }).bar.props.barStyle, 'dark-content')
        }, true)

        test('shared default and nested custom style identities survive repeated calls', function () {
          const style = Object.freeze({ height: 37, backgroundColor: 'gold', nested: Object.freeze({ sentinel: true }) })
          for (let i = 0; i < 3; i++) {
            assert.strictEqual(evaluate({}).view.props.style[2], defaults.style)
            const result = evaluate(Object.freeze({ backgroundColor: 'tomato', style: style }))
            assert.deepStrictEqual(result.view.props.style, [styleCalls[0].StatusBar, { backgroundColor: 'tomato' }, style])
            assert.strictEqual(result.view.props.style[2], style)
            assert.strictEqual(result.view.props.style[2].nested, style.nested)
          }
        })

        test('callbacks and arbitrary props pass through without input mutation or invocation', function () {
          const calls = []
          const onLayout = function (event) { calls.push(event) }
          const arbitrary = Object.freeze({ nested: Object.freeze([1]) })
          const props = Object.freeze({ hidden: true, animated: false, showHideTransition: 'slide', testID: 'bar', arbitrary: arbitrary, onLayout: onLayout })
          const result = evaluate(props)
          for (const key of Object.keys(props)) assert.strictEqual(result.bar.props[key], props[key])
          assert.deepStrictEqual(Object.keys(result.bar.props).sort(), Object.keys(props).concat(['barStyle', 'translucent', 'backgroundColor']).sort())
          assert.deepStrictEqual(calls, [])
          const event = Object.freeze({ nativeEvent: 'sentinel' })
          result.bar.props.onLayout(event)
          assert.deepStrictEqual(calls, [event])
        })

        test('rest props retain their last-spread overrides', function () {
          for (const value of [undefined, null, false, 0, '', 'override']) {
            const result = evaluate(Object.freeze({ dark: true, backgroundColor: 'red', barStyle: value, translucent: value }))
            assert.strictEqual(result.bar.props.barStyle, value)
            assert.strictEqual(result.bar.props.translucent, value)
            assert.strictEqual(result.view.props.style[1].backgroundColor, 'red')
          }
        })

        test('children keep identity without flattening', function () {
          const child = React.createElement('SentinelText', { key: 'sentinel' }, 'child')
          for (const children of [undefined, null, false, 0, '', 'hello', child, Object.freeze([child])]) {
            assert.strictEqual(evaluate(Object.freeze({ children: children })).bar.props.children, children)
          }
        })

        test('public default mutation and replacement are read dynamically', function () {
          const saved = Object.assign({}, defaults)
          function verifyDefaults (expected) {
            for (const props of [{}, { dark: undefined, backgroundColor: undefined, style: undefined }]) {
              const result = evaluate(Object.freeze(props))
              assert.strictEqual(result.view.props.style[1].backgroundColor, expected.backgroundColor)
              assert.strictEqual(result.view.props.style[2], expected.style)
              assert.strictEqual(result.bar.props.barStyle, expected.dark ? 'dark-content' : 'light-content')
            }
          }
          try {
            defaults.dark = true
            defaults.backgroundColor = 'pink'
            defaults.style = Object.freeze({ opacity: 0.5 })
            verifyDefaults(defaults)
            StatusBar.defaultProps = Object.freeze({ dark: false, backgroundColor: 'blue', style: Object.freeze({ height: 50 }) })
            verifyDefaults(StatusBar.defaultProps)
            for (const replacement of [{}, { dark: true }, null, undefined]) {
              StatusBar.defaultProps = replacement
              verifyDefaults(replacement || {})
            }
          } finally {
            Object.assign(defaults, saved)
            StatusBar.defaultProps = defaults
          }
        })

        test('added and inherited defaults retain callbacks, rest props and overrides', function () {
          let calls = 0
          const callback = function () { calls++ }
          const child = Object.freeze(['default-child'])
          const arbitrary = Object.freeze({ sentinel: true })
          const replacement = Object.assign(Object.create({ inheritedFlag: 'inherited' }), defaults, {
            translucent: false, barStyle: 'custom-default', onLayout: callback, arbitrary: arbitrary, children: child
          })
          try {
            StatusBar.defaultProps = replacement
            for (const props of [{}, { translucent: undefined, barStyle: undefined, onLayout: undefined, arbitrary: undefined, children: undefined, inheritedFlag: undefined }]) {
              const result = evaluate(Object.freeze(props))
              assert.strictEqual(result.bar.props.translucent, false)
              assert.strictEqual(result.bar.props.barStyle, 'custom-default')
              assert.strictEqual(result.bar.props.onLayout, callback)
              assert.strictEqual(result.bar.props.arbitrary, arbitrary)
              assert.strictEqual(result.bar.props.children, child)
              assert.strictEqual(result.bar.props.inheritedFlag, 'inherited')
              assert.strictEqual(calls, 0)
              assert.deepStrictEqual(Object.keys(props).filter(function (key) { return props[key] !== undefined }), [])
            }
            replacement.translucent = true
            assert.strictEqual(evaluate({}).bar.props.translucent, true)
            const explicit = Object.freeze({ translucent: null, barStyle: '', onLayout: null, arbitrary: false, children: 0, inheritedFlag: null })
            const result = evaluate(explicit)
            for (const key of Object.keys(explicit)) assert.strictEqual(result.bar.props[key], explicit[key])
          } finally {
            StatusBar.defaultProps = defaults
          }
        })

        test('no native calls or style recreation occurs', function () {
          assert.deepStrictEqual(styleCalls, [{ StatusBar: { height: 24 } }])
          assert.deepStrictEqual(imperativeCalls, [])
        })
      }
    }
  }
  console.log(passed + ' JSX checks passed (' + process.env.NODE_ENV + ', React ' + React.version + ')')
}
