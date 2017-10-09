import React from 'react';
import { Route, Switch } from 'react-router-dom';

import Bots from '../Components/Bots';
import Files from '../Components/Files';
import Settings from '../Components/Settings';

const Routes = (props) => {
  const routes = (
    <Switch>
      <Route exact path="/" render={routeProps => <Bots {...props} {...routeProps} />} />
      <Route path="/files" render={() => <Files {...props} />} />
      <Route path="/settings" render={() => <Settings {...props} />} />
      <Route path="/:id" render={routeProps => <Bots {...props} {...routeProps} />} />
    </Switch>
  );

  // routes.propTypes = {
  //   loggingIn: PropTypes.bool.isRequired,
  //   authenticated: PropTypes.bool.isRequired,
  // };

  return routes;
};

export default Routes;
