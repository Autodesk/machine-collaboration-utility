const React = require('react');
const render = require('react-dom').render;
const Router = require('react-router').Router;
const browserHistory = require('react-router').browserHistory;
const routes = require('./routes');

render(
  <Router routes={routes} history={browserHistory}/>,
  document.getElementById('app')
);
