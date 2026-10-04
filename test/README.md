# JavaScript regression tests

This isolated fixture pins React and react-test-renderer 16.14.0,
prop-types 15.8.1 and Babel standalone 7.29.9. Use Node.js 16 or newer;
Node 16 is only a historical compatibility check, not a supported security
baseline. The fixture avoids the legacy root development graph and wildcard
React Native peer.

From the repository root:

```sh
npm ci --prefix test --ignore-scripts --no-audit --no-fund
npm run test:regression
```

The runner launches separate development and production processes, compiles the
actual JSX source, and uses the real React renderer and prop-types with in-memory
React Native host doubles. It checks defaults, wrapper/native rendering,
validator identity and accepted/rejected values, style ordering, rest-prop
overrides, child/callback identity, update behavior and import/render side effects.
It preserves the existing self-spread in `StatusBar.propTypes` and object-only
style validator, including their limitations.

## Classic and automatic JSX contracts

`npm run test:regression` also runs `test/jsx.js`. It compiles both the component
and a JSX caller with Babel, using every pairing of classic and automatic JSX.
Development additionally includes the automatic `jsxDEV` transform. These tests
use real React element creation and evaluate this hook-free component with those
element props. They do not use a modern reconciler or render the native doubles.
The existing React 16 renderer tests remain separate and unchanged in scope.

The JSX checks cover omitted/undefined defaults, explicit falsey values, shared
default/custom style references, passthrough order, callbacks and children,
frozen inputs, native side effects, and the public `defaultProps` object. They
exercise in-place mutation, full/partial/null/undefined replacement, additional
default props and inherited enumerable defaults. Explicit props win unless they
are undefined. No callback is invoked by the component.

By default the JSX suite uses the fixture's pinned React 16.14.0. To use another
already installed React package without changing either dependency graph, set
`STATUSBAR_TEST_REACT_RUNTIME` to a consumer directory containing
`node_modules/react` and that package's dependencies:

```sh
STATUSBAR_TEST_REACT_RUNTIME=/absolute/path/to/react18-consumer node test/jsx.js
STATUSBAR_TEST_REACT_RUNTIME=/absolute/path/to/react19-consumer node test/jsx.js
```

The exact additional versions validated are React 18.3.1 and 19.3.0. Run each
command separately: each launches isolated development and production processes
and reports the actual React version. The override affects only `test/jsx.js`,
so it can also be used with `npm run test:regression` without mixing React 18/19
with the pinned React 16 test renderer. Babel and the renderer still come from
this fixture. The JSX suite requires a React package with `jsx-runtime` and
`jsx-dev-runtime` entry points; it does not install or download packages.

On React 19 automatic JSX, the caller no longer resolves function-component
`defaultProps`. The component now resolves the current public defaults itself,
including added passthrough defaults, before its original destructuring. The
default style remains the same shared object. Retaining the public metadata also
retains React 18's function-`defaultProps` deprecation warning when rendered there.
React 19 does not automatically invoke function-component `propTypes`; the
existing explicit validator checks do not imply otherwise.

To test a packed package installed in a separate consumer, use that package's
actual entry and consumer-resolved prop-types:

```sh
STATUSBAR_TEST_SOURCE=/absolute/path/to/consumer/node_modules/nanokit-statusbar/index.js \
STATUSBAR_TEST_RUNTIME=/absolute/path/to/consumer npm run test:regression
```

Combine these source/prop-types overrides with `STATUSBAR_TEST_REACT_RUNTIME` to
run the same JSX contracts against a packed package under another React version.

Do not install the old root dependency graph merely to run these checks.
The root `npm test` runs a mutating legacy formatter, not behavioral tests.
This fixture is separate and does not establish a complete root frozen install,
native Android/iOS rendering, native event behavior, or compatibility with every
version admitted by the unchanged wildcard peers. The published entry remains
JSX/ES modules requiring a compatible consumer bundler. The fixture directory is
not included by the existing package files whitelist.
In particular, these JavaScript checks do not establish safe-area/notch handling,
Android edge-to-edge behavior, native statusbar appearance, or SDK/device support.
The existing fixed 24-unit wrapper, native transparent/translucent props, JSX,
layout and peer ranges are unchanged.
