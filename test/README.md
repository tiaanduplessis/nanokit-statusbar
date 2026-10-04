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

To test a packed package installed in a separate consumer, use that package's
actual entry and consumer-resolved prop-types:

```sh
STATUSBAR_TEST_SOURCE=/absolute/path/to/consumer/node_modules/nanokit-statusbar/index.js \
STATUSBAR_TEST_RUNTIME=/absolute/path/to/consumer npm run test:regression
```

Do not install the old root dependency graph merely to run these checks.
The root `npm test` runs a mutating legacy formatter, not behavioral tests.
This fixture is separate and does not establish a complete root frozen install,
native Android/iOS rendering, native event behavior, or compatibility with every
version admitted by the unchanged wildcard peers. The published entry remains
JSX/ES modules requiring a compatible consumer bundler. The fixture directory is
not included by the existing package files whitelist.
