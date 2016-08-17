'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class JogSpeeds extends _react2.default.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return _react2.default.createElement(
      'div',
      { className: 'row' },
      _react2.default.createElement(
        'h3',
        null,
        'JOG SPEEDS (mm/min)'
      ),
      _react2.default.createElement(
        'div',
        { className: 'col-sm-3' },
        _react2.default.createElement(
          'p',
          null,
          'X-Axis'
        ),
        _react2.default.createElement(
          'div',
          { className: 'row' },
          _react2.default.createElement('input', { className: 'col-sm-5', type: 'text' }),
          _react2.default.createElement(
            'button',
            { className: 'col-sm-1' },
            '*'
          )
        )
      ),
      _react2.default.createElement(
        'div',
        { className: 'col-sm-3' },
        _react2.default.createElement(
          'p',
          null,
          'Y-Axis'
        ),
        _react2.default.createElement(
          'div',
          { className: 'row' },
          _react2.default.createElement('input', { className: 'col-sm-5', type: 'text' }),
          _react2.default.createElement(
            'button',
            { className: 'col-sm-1' },
            '*'
          )
        )
      ),
      _react2.default.createElement(
        'div',
        { className: 'col-sm-3' },
        _react2.default.createElement(
          'p',
          null,
          'Z-Axis'
        ),
        _react2.default.createElement(
          'div',
          { className: 'row' },
          _react2.default.createElement('input', { className: 'col-sm-5', type: 'text' }),
          _react2.default.createElement(
            'button',
            { className: 'col-sm-1' },
            '*'
          )
        )
      ),
      _react2.default.createElement(
        'div',
        { className: 'col-sm-3' },
        _react2.default.createElement(
          'p',
          null,
          'E-Axis'
        ),
        _react2.default.createElement(
          'div',
          { className: 'row' },
          _react2.default.createElement('input', { className: 'col-sm-5', type: 'text' }),
          _react2.default.createElement(
            'button',
            { className: 'col-sm-1' },
            '*'
          )
        )
      )
    );
  }
}
exports.default = JogSpeeds;
//# sourceMappingURL=JogSpeeds.js.map
