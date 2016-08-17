'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class DisableMotors extends _react2.default.Component {
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
        'DISABLE MOTORS'
      ),
      _react2.default.createElement(
        'div',
        { className: 'row' },
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'button',
            null,
            'X'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'button',
            null,
            'Y'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'button',
            null,
            'Z'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'button',
            null,
            'E'
          )
        )
      ),
      _react2.default.createElement('br', null),
      _react2.default.createElement(
        'div',
        { className: 'row' },
        _react2.default.createElement(
          'div',
          { className: 'col-sm-12' },
          _react2.default.createElement(
            'button',
            { style: { width: "100%" } },
            'All'
          )
        )
      )
    );
  }
}
exports.default = DisableMotors;
//# sourceMappingURL=DisableMotors.js.map
