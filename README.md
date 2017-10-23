<h1 align="center">nanokit-statusbar</h1>
<div align="center">
  <strong>Consistent StatusBar component for React Native</strong>
</div>
<br>
<div align="center">
  <a href="https://npmjs.org/package/nanokit-statusbar">
    <img src="https://img.shields.io/npm/v/nanokit-statusbar.svg?style=flat-square" alt="npm package version" />
  </a>
  <a href="https://npmjs.org/package/nanokit-statusbar">
  <img src="https://img.shields.io/npm/dm/nanokit-statusbar.svg?style=flat-square" alt="npm downloads" />
  </a>
  <a href="https://github.com/feross/standard">
    <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square" alt="standard JS linter" />
  </a>
  <a href="https://github.com/prettier/prettier">
    <img src="https://img.shields.io/badge/styled_with-prettier-ff69b4.svg?style=flat-square" alt="prettier code formatting" />
  </a>
  <a href="https://travis-ci.org/tiaanduplessis/nanokit-statusbar">
    <img src="https://img.shields.io/travis/tiaanduplessis/nanokit-statusbar.svg?style=flat-square" alt="travis ci build status" />
  </a>
    <a href="https://codecov.io/gh/tiaanduplessis/nanokit-statusbar">
  <img src="https://codecov.io/gh/tiaanduplessis/nanokit-statusbar/branch/master/graph/badge.svg" alt="Codecov" />
</a>
    <a href="https://greenkeeper.io/">
    <img src="https://badges.greenkeeper.io/tiaanduplessis/nanokit-statusbar.svg" alt="Greenkeeper" />
  </a>
  <a href="https://github.com/tiaanduplessis/nanokit-statusbar/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/nanokit-statusbar.svg?style=flat-square" alt="project license" />
  </a>
  <a href="http://makeapullrequest.com">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="make a pull request" />
  </a>
</div>
<br>
<div align="center">
  <a href="https://github.com/tiaanduplessis/nanokit-statusbar/watchers">
    <img src="https://img.shields.io/github/watchers/tiaanduplessis/nanokit-statusbar.svg?style=social" alt="Github Watch Badge" />
  </a>
  <a href="https://github.com/tiaanduplessis/nanokit-statusbar/stargazers">
    <img src="https://img.shields.io/github/stars/tiaanduplessis/nanokit-statusbar.svg?style=social" alt="Github Star Badge" />
  </a>
  <a href="https://twitter.com/intent/tweet?text=Check%20out%20nanokit-statusbar!%20https://github.com/tiaanduplessis/nanokit-statusbar%20%F0%9F%91%8D">
    <img src="https://img.shields.io/twitter/url/https/github.com/tiaanduplessis/nanokit-statusbar.svg?style=social" alt="Tweet" />
  </a>
</div>
<br>
<div align="center">
  Built with ❤︎ by <a href="https://github.com/tiaanduplessis">tiaanduplessis</a> and <a href="https://github.com/tiaanduplessis/nanokit-statusbar/contributors">contributors</a>
</div>

<h2>Table of Contents</h2>
<details>
  <summary>Table of Contents</summary>
  <li><a href="#about">About</a></li>
  <li><a href="#install">Install</a></li>
  <li><a href="#usage">Usage</a></li>
  <li><a href="#contribute">Contribute</a></li>
  <li><a href="#license">License</a></li>
</details>

## About

Provides a simple wrapper around the [`StatusBar` component](https://facebook.github.io/react-native/docs/statusbar.html) to ensure consistent rendering accross iOS and Android.

## Install

```sh
$ npm install nanokit-statusbar
# OR
$ yarn add nanokit-statusbar
```

## Usage

```jsx
import React from 'react'
import {View} from 'react-native'
import StatusBar from 'nanokit-statusbar'

const Example = () => (
  <View style={{flex: 1}}>
    <StatusBar backgroundColor='tomato'/>
    <StatusBar dark/>
  </View>
)

```

## Contributing

Contributions are welcome!

1. Fork it.
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

Or open up [a issue](https://github.com/tiaanduplessis/nanokit-statusbar/issues).

## License

Licensed under the MIT License.
