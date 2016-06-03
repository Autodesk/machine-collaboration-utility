import React from 'react';
import { Route, IndexRoute } from 'react-router';
import App from './App';
import Files from './modules/Files';
import Jobs from './modules/Jobs';
import Bots from './modules/Bots';

module.exports = (
  <Route path="/" component={App}>
    <Route path="/files" component={Files}/>
    <Route path="/jobs" component={Jobs}/>
    <Route path="/bots" component={Bots}/>
  </Route>
);
