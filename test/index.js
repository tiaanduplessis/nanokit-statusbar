'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')

if (!process.env.STATUSBAR_TEST_MODE) {
  const childProcess = require('child_process')
  for (const mode of ['development', 'production']) {
    const result = childProcess.spawnSync(process.execPath, [__filename], {
      env: Object.assign({}, process.env, { NODE_ENV: mode, STATUSBAR_TEST_MODE: mode }),
      stdio: 'inherit'
    })
    if (result.error) throw result.error
    assert.strictEqual(result.status, 0, mode + ' tests failed')
  }
} else {
  run()
}

function run () {
  const React = require('react')
  const renderer = require('react-test-renderer')
  const runtime = process.env.STATUSBAR_TEST_RUNTIME
    ? path.resolve(process.env.STATUSBAR_TEST_RUNTIME)
    : __dirname
  const PropTypes = require(require.resolve('prop-types', { paths: [runtime] }))
  const version = require(require.resolve('prop-types/package.json', { paths: [runtime] })).version
  const filename = path.resolve(process.env.STATUSBAR_TEST_SOURCE || path.join(__dirname, '..', 'index.js'))
  const source = fs.readFileSync(filename, 'utf8')
  const compiled = require('@babel/standalone').transform(source, {
    filename: filename,
    presets: ['react'],
    plugins: ['transform-modules-commonjs']
  }).code
  let passed = 0
  let validationId = 0

  function warnings (check) {
    const messages = []
    const original = console.error
    console.error = function () { messages.push(Array.from(arguments).join(' ')) }
    try { check() } finally { console.error = original }
    return messages
  }

  function freeze (value) {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.keys(value).forEach(function (key) { freeze(value[key]) })
      Object.freeze(value)
    }
    return value
  }

  for (const inherited of [false, true]) {
    const styleCalls = []
    const imperativeCalls = []
    function View (props) { return React.createElement('NativeView', props) }
    function NativeStatusBar (props) { return React.createElement('NativeStatusBar', props) }
    if (inherited) NativeStatusBar.propTypes = { nativeFlag: PropTypes.bool }
    for (const key of ['setBarStyle', 'setHidden', 'setBackgroundColor', 'setTranslucent']) {
      NativeStatusBar[key] = function () { imperativeCalls.push(key) }
    }
    const native = {
      View: View,
      StatusBar: NativeStatusBar,
      StyleSheet: {
        create: function (styles) {
          styleCalls.push(styles)
          return freeze(styles)
        }
      }
    }
    const exports = {}
    const imports = { react: React, 'react-native': native, 'prop-types': PropTypes }
    const wrapper = vm.runInThisContext('(function(require, exports) {\n' + compiled + '\n})', { filename: filename })
    wrapper(function (name) {
      assert(Object.prototype.hasOwnProperty.call(imports, name), 'Unexpected import: ' + name)
      return imports[name]
    }, exports)
    const StatusBar = exports.default

    function test (name, check) {
      check()
      passed++
      console.log('ok - ' + process.env.NODE_ENV + ' - native propTypes=' + inherited + ' - ' + name)
    }
    function render (props, check, allowWarnings) {
      const messages = warnings(function () {
        const tree = renderer.create(React.createElement(StatusBar, props))
        try {
          check(tree.root.findByType('NativeView'), tree.root.findByType('NativeStatusBar'), tree)
        } finally { tree.unmount() }
      })
      if (!allowWarnings) assert.deepStrictEqual(messages, [])
      else assert(messages.every(function (message) { return message.includes('Failed') && message.includes('type') }), messages.join('\n'))
      return messages
    }
    function validate (props) {
      return warnings(function () {
        // Unique names also avoid the old 15.6.0 warning cache, which has no reset API.
        PropTypes.checkPropTypes(StatusBar.propTypes, props, 'prop', 'StatusBarFixture' + (++validationId))
      })
    }

    test('default export and optional validators retain exact identities', function () {
      assert.deepStrictEqual(Object.keys(exports), ['default'])
      assert.strictEqual(typeof StatusBar, 'function')
      assert.deepStrictEqual(Object.keys(StatusBar.propTypes).sort(), ['backgroundColor', 'dark', 'style'])
      assert.strictEqual(StatusBar.propTypes.style, PropTypes.object)
      assert.strictEqual(StatusBar.propTypes.dark, PropTypes.bool)
      assert.strictEqual(StatusBar.propTypes.backgroundColor, PropTypes.string)
      // The existing self-spread does not inherit NativeStatusBar.propTypes.
      assert.strictEqual(StatusBar.propTypes.nativeFlag, undefined)
      assert.deepStrictEqual(StatusBar.defaultProps, {
        dark: false, backgroundColor: 'rgba(0,0,0,0.2)', style: {}
      })
    })

    test('import creates one height-24 style without imperative native calls', function () {
      assert.deepStrictEqual(styleCalls, [{ StatusBar: { height: 24 } }])
      assert.deepStrictEqual(imperativeCalls, [])
    })

    test('default render has exactly one outer View and native child', function () {
      render({}, function (view, bar, tree) {
        assert.strictEqual(tree.root.findAllByType('NativeView').length, 1)
        assert.strictEqual(tree.root.findAllByType('NativeStatusBar').length, 1)
        assert.deepStrictEqual(Object.keys(view.props).sort(), ['children', 'style'])
        assert.deepStrictEqual(view.props.style, [{ height: 24 }, { backgroundColor: 'rgba(0,0,0,0.2)' }, {}])
        assert.strictEqual(view.props.style[0], styleCalls[0].StatusBar)
        assert.strictEqual(view.props.style[2], StatusBar.defaultProps.style)
        assert.strictEqual(view.props.children.type, NativeStatusBar)
        assert.deepStrictEqual(bar.props, { barStyle: 'light-content', translucent: true, backgroundColor: 'transparent' })
      })
    })

    test('dark booleans select the existing light and dark content names', function () {
      for (const dark of [false, true, undefined, null]) {
        render(freeze({ dark: dark }), function (view, bar) {
          assert.strictEqual(bar.props.barStyle, dark ? 'dark-content' : 'light-content')
          assert(!Object.prototype.hasOwnProperty.call(bar.props, 'dark'))
        })
      }
    })

    test('defaults apply only to omitted or undefined props', function () {
      for (const backgroundColor of [undefined, null, '', 'tomato']) {
        for (const style of [undefined, null, freeze({ opacity: 0 })]) {
          render(freeze({ backgroundColor: backgroundColor, style: style }), function (view, bar) {
            assert.strictEqual(view.props.style[1].backgroundColor, backgroundColor === undefined ? 'rgba(0,0,0,0.2)' : backgroundColor)
            assert.strictEqual(view.props.style[2], style === undefined ? StatusBar.defaultProps.style : style)
            assert.strictEqual(bar.props.backgroundColor, 'transparent')
          })
        }
      }
    })

    test('custom styles stay last with original nested references', function () {
      const style = freeze({ height: 37, backgroundColor: 'gold', nested: { sentinel: true } })
      render(freeze({ backgroundColor: 'tomato', style: style }), function (view, bar) {
        assert.deepStrictEqual(view.props.style, [styleCalls[0].StatusBar, { backgroundColor: 'tomato' }, style])
        assert.strictEqual(view.props.style[2], style)
        assert.strictEqual(view.props.style[2].nested, style.nested)
        assert(!Object.prototype.hasOwnProperty.call(bar.props, 'style'))
      })
    })

    test('rest props and callbacks go only to the native StatusBar', function () {
      const calls = []
      const onLayout = function (event) { calls.push(event) }
      const arbitrary = freeze({ nested: [1] })
      const props = freeze({ hidden: true, animated: false, showHideTransition: 'slide', testID: 'bar', arbitrary: arbitrary, onLayout: onLayout })
      render(props, function (view, bar) {
        assert.deepStrictEqual(Object.keys(view.props).sort(), ['children', 'style'])
        for (const key of Object.keys(props)) assert.strictEqual(bar.props[key], props[key])
        assert.deepStrictEqual(Object.keys(bar.props).sort(), Object.keys(props).concat(['barStyle', 'translucent', 'backgroundColor']).sort())
        assert.deepStrictEqual(calls, [])
        const event = freeze({ nativeEvent: { sentinel: true } })
        bar.props.onLayout(event)
        assert.deepStrictEqual(calls, [event])
      })
    })

    test('rest barStyle and translucent override computed native defaults', function () {
      for (const props of [
        { dark: true, barStyle: 'light-content', translucent: false },
        { dark: false, barStyle: 'custom', translucent: null },
        { barStyle: undefined, translucent: undefined }
      ]) {
        render(freeze(props), function (view, bar) {
          assert.strictEqual(bar.props.barStyle, props.barStyle)
          assert.strictEqual(bar.props.translucent, props.translucent)
          assert.strictEqual(bar.props.backgroundColor, 'transparent')
        })
      }
    })

    test('children are forwarded inside the native component without flattening', function () {
      const child = React.createElement('SentinelText', { key: 'sentinel' }, 'child')
      for (const children of [undefined, null, '', 'hello', 0, false, child, freeze([child])]) {
        render(freeze({ children: children }), function (view, bar) {
          assert.strictEqual(bar.props.children, children)
          assert.strictEqual(view.props.children.type, NativeStatusBar)
        })
      }
    })

    test('optional declarations accept their existing domains', function () {
      for (const value of [undefined, null]) assert.deepStrictEqual(validate({ dark: value, style: value, backgroundColor: value }), [])
      assert.deepStrictEqual(validate({ dark: false, style: {}, backgroundColor: '' }), [])
      assert.deepStrictEqual(validate({ dark: true, style: { height: 0 }, backgroundColor: 'not-a-native-color' }), [])
      assert.deepStrictEqual(validate({ nativeFlag: 'not-inherited', extra: true }), [])
    })

    test('wrong declared types warn only in development without throwing', function () {
      const invalid = { dark: ['yes', 1, {}, []], backgroundColor: [12, false, {}, []], style: ['style', 12, false, []] }
      for (const key of Object.keys(invalid)) {
        for (const value of invalid[key]) {
          const messages = validate({ [key]: value })
          assert.strictEqual(messages.length, process.env.NODE_ENV === 'development' ? 1 : 0, key)
          if (messages.length) assert(messages[0].includes('`' + key + '`'), messages[0])
        }
      }
    })

    test('invalid runtime props still render using existing truthiness and style pass-through', function () {
      for (const dark of ['yes', 1, 0, '']) {
        const style = freeze([{ height: 80 }, { opacity: 0.2 }])
        render(freeze({ dark: dark, style: style }), function (view, bar) {
          assert.strictEqual(bar.props.barStyle, dark ? 'dark-content' : 'light-content')
          assert.strictEqual(view.props.style[2], style)
        }, true)
      }
    })

    test('updates preserve defaults, order and props without recreating base styles', function () {
      render({}, function (view, bar, tree) {
        for (const props of [
          { dark: true, backgroundColor: 'red' },
          { style: { height: 5 }, hidden: true },
          { children: 'updated', barStyle: 'override', translucent: false },
          { dark: null, style: null, backgroundColor: null },
          {}
        ]) {
          tree.update(React.createElement(StatusBar, freeze(props)))
          const updatedView = tree.root.findByType('NativeView')
          const updatedBar = tree.root.findByType('NativeStatusBar')
          assert.strictEqual(updatedView.props.style[0], styleCalls[0].StatusBar)
          assert.strictEqual(updatedView.props.style[2], props.style === undefined ? StatusBar.defaultProps.style : props.style)
          assert.strictEqual(updatedBar.props.backgroundColor, 'transparent')
          assert.strictEqual(updatedBar.props.children, props.children)
          assert.strictEqual(updatedBar.props.barStyle, Object.prototype.hasOwnProperty.call(props, 'barStyle') ? props.barStyle : props.dark ? 'dark-content' : 'light-content')
        }
      })
      assert.strictEqual(styleCalls.length, 1)
      assert.deepStrictEqual(imperativeCalls, [])
    })
  }
  console.log(passed + ' checks passed (' + process.env.NODE_ENV + ', React ' + React.version + ', prop-types ' + version + ')')
}
