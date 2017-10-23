import React from 'react'
import { View, StatusBar as RNStatusBar, StyleSheet } from 'react-native'
import PropTypes from 'prop-types'

const StatusBar = ({ dark, backgroundColor, style, ...otherProps }) => {
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
