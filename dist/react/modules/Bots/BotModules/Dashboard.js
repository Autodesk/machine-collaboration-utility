'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _ProgressBar = require('react-bootstrap/lib/ProgressBar');

var _ProgressBar2 = _interopRequireDefault(_ProgressBar);

var _JogPanel = require('./JogPanel');

var _JogPanel2 = _interopRequireDefault(_JogPanel);

var _CurrentJob = require('./CurrentJob');

var _CurrentJob2 = _interopRequireDefault(_CurrentJob);

var _HomeAxes = require('./HomeAxes');

var _HomeAxes2 = _interopRequireDefault(_HomeAxes);

var _PositionFeedback = require('./PositionFeedback');

var _PositionFeedback2 = _interopRequireDefault(_PositionFeedback);

var _DisableMotors = require('./DisableMotors');

var _DisableMotors2 = _interopRequireDefault(_DisableMotors);

var _JogSpeeds = require('./JogSpeeds');

var _JogSpeeds2 = _interopRequireDefault(_JogSpeeds);

var _Temp = require('./Temp');

var _Temp2 = _interopRequireDefault(_Temp);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Dashboard extends _react2.default.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const endpoint = this.props.endpoint;
    return _react2.default.createElement(
      'div',
      { id: 'dashboard' },
      _react2.default.createElement(
        'div',
        { className: 'container' },
        _react2.default.createElement(
          'div',
          { id: 'left', className: 'col-md-6' },
          _react2.default.createElement(
            'div',
            { className: 'area' },
            _react2.default.createElement(_CurrentJob2.default, { endpoint: endpoint })
          ),
          _react2.default.createElement(
            'div',
            { className: 'area' },
            _react2.default.createElement(_JogPanel2.default, { endpoint: endpoint })
          ),
          _react2.default.createElement(
            'div',
            { className: 'area' },
            _react2.default.createElement(_HomeAxes2.default, { endpoint: endpoint })
          )
        ),
        _react2.default.createElement(
          'div',
          { id: 'right', className: 'col-md-6' },
          _react2.default.createElement(
            'div',
            { className: 'area row' },
            _react2.default.createElement(
              'div',
              { className: 'col-sm-6' },
              _react2.default.createElement(_PositionFeedback2.default, { endpoint: endpoint })
            ),
            _react2.default.createElement(
              'div',
              { className: 'col-sm-6' },
              _react2.default.createElement(_DisableMotors2.default, { endpoint: endpoint })
            )
          ),
          _react2.default.createElement(
            'div',
            { className: 'area' },
            _react2.default.createElement(_JogSpeeds2.default, { endpoint: endpoint })
          ),
          _react2.default.createElement(
            'div',
            { className: 'area' },
            _react2.default.createElement(_Temp2.default, { endpoint: endpoint })
          )
        ),
        ' '
      )
    );
  }
}
exports.default = Dashboard;
//# sourceMappingURL=Dashboard.js.map
