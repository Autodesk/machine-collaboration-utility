'use strict';

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactRouter = require('react-router');

var _App = require('./App');

var _App2 = _interopRequireDefault(_App);

var _Files = require('./modules/Files');

var _Files2 = _interopRequireDefault(_Files);

var _Jobs = require('./modules/Jobs');

var _Jobs2 = _interopRequireDefault(_Jobs);

var _Bots = require('./modules/Bots');

var _Bots2 = _interopRequireDefault(_Bots);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = _react2.default.createElement(
  _reactRouter.Route,
  { path: '/', component: _App2.default },
  _react2.default.createElement(_reactRouter.Route, { path: '', component: _Bots2.default }),
  _react2.default.createElement(_reactRouter.Route, { path: '/files', component: _Files2.default }),
  _react2.default.createElement(_reactRouter.Route, { path: '/jobs', component: _Jobs2.default }),
  _react2.default.createElement(_reactRouter.IndexRoute, { component: _Bots2.default })
);
//# sourceMappingURL=routes.js.map
