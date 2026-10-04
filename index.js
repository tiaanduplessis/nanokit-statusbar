import React from 'react'
import { View, StatusBar as RNStatusBar, StyleSheet } from 'react-native'
import PropTypes from 'prop-types'

const StatusBar = props => {
  const resolvedProps = { ...props }
  const defaults = StatusBar.defaultProps
  if (defaults) {
    for (const key in defaults) {
      if (resolvedProps[key] === undefined) resolvedProps[key] = defaults[key]
    }
  }
  const { dark, backgroundColor, style, ...otherProps } = resolvedProps
  const barStyle = dark ? 'dark-content' : 'light-content'

  return (
    <View style={[styles.StatusBar, { backgroundColor }, style]}>
      <RNStatusBar
        barStyle={barStyle}
        translucent
        backgroundColor='transparent'
        {...otherProps}
      />
    </View>
  )
}

StatusBar.defaultProps = {
  dark: false,
  backgroundColor: 'rgba(0,0,0,0.2)',
  style: {}
}

StatusBar.propTypes = {
  ...StatusBar.propTypes,
  style: PropTypes.object,
  dark: PropTypes.bool,
  backgroundColor: PropTypes.string
}

const styles = StyleSheet.create({
  StatusBar: {
    height: 24
  }
})

export default StatusBar
