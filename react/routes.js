import React from 'react';
import { Route, IndexRoute } from 'react-router';

import App from './App';
import Files from './modules/Files';
import Jobs from './modules/Jobs';
import Bots from './modules/Bots';

function requireBot(nextState, replaceState) {
  // look for bot in the props
  if (false) {
    replaceState({ nextPathname: nextState.location.pathname }, '/login');
  }
}

module.exports = (
  <Route path="/" component={App}>
    <Route path="/files" component={Files} />
    <Route path="" component={Bots}>
      <Route path=":id" component={Bots} />
    </Route>
    <IndexRoute component={Bots} />
  </Route>
);
