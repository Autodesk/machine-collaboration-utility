'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class PositionFeedback extends _react2.default.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'h3',
        null,
        'POSITIONING'
      ),
      _react2.default.createElement(
        'div',
        { className: 'col-sm-4' },
        _react2.default.createElement(
          'h5',
          null,
          'X-Axis'
        ),
        _react2.default.createElement(
          'div',
          null,
          '0'
        ),
        _react2.default.createElement(
          'button',
          null,
          'Zero X'
        )
      ),
      _react2.default.createElement(
        'div',
        { className: 'col-sm-4' },
        _react2.default.createElement(
          'h5',
          null,
          'Y-Axis'
        ),
        _react2.default.createElement(
          'div',
          null,
          '0'
        ),
        _react2.default.createElement(
          'button',
          null,
          'Zero Y'
        )
      ),
      _react2.default.createElement(
        'div',
        { className: 'col-sm-4' },
        _react2.default.createElement(
          'h5',
          null,
          'Z-Axis'
        ),
        _react2.default.createElement(
          'div',
          null,
          '0'
        ),
        _react2.default.createElement(
          'button',
          null,
          'Zero Z'
        )
      )
    );
  }
}
exports.default = PositionFeedback;
//# sourceMappingURL=PositionFeedback.js.map
