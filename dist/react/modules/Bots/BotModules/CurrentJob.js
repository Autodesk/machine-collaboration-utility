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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class CurrentJob extends _react2.default.Component {
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
        'Current Job!'
      ),
      _react2.default.createElement(
        'div',
        { className: 'row' },
        _react2.default.createElement(
          'div',
          { className: 'col-sm-4' },
          _react2.default.createElement(
            'button',
            null,
            'Connect'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-4' },
          _react2.default.createElement(
            'button',
            null,
            'Pause/Resume'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-4' },
          _react2.default.createElement(
            'button',
            null,
            'Cancel'
          )
        )
      ),
      _react2.default.createElement('br', null),
      _react2.default.createElement(_ProgressBar2.default, { active: true, now: 60, label: `${ 60 }%` })
    );
  }
}
exports.default = CurrentJob;
//# sourceMappingURL=CurrentJob.js.map
