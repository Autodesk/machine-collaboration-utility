import React from 'react'
import { Route, IndexRoute } from 'react-router'
import App from './App'
import Files from './Files'

module.exports = (
  <Route path="/" component={App}>
    <IndexRoute component={Files}/>
    <Route path="/files" component={Files}/>
  </Route>
)
