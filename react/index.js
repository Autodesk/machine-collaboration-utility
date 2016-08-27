/* global document */
import React from 'react';
import { render } from 'react-dom';
import { Router, browserHistory } from 'react-router';

const routes = require('./routes');

render(
  <Router routes={routes} history={browserHistory} />,
  document.getElementById('app')
);
