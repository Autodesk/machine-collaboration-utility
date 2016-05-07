import React from 'react'
import Header from './Header'

export default React.createClass({
  render() {
    return (
      <div>
        <Header/>
        {this.props.children}
      </div>
    )
  }
})
