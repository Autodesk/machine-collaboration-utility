'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Terminal extends _react2.default.Component {
  constructor(props) {
    super(props);

    this.processGcode = this.processGcode.bind(this);
  }

  processGcode(event) {
    event.preventDefault();
    console.log('sweet gcode', event.target.gcode.value);
  }

  render() {
    return _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'ul',
        { id: 'terminal-reply' },
        _react2.default.createElement(
          'form',
          { id: 'gcode-terminal', onSubmit: this.processGcode },
          _react2.default.createElement('input', { id: 'gcode-input', type: 'text', name: 'gcode', defaultValue: '', autocomplete: 'off', placeholder: '', autofocus: 'autofocus', className: 'float-left' }),
          _react2.default.createElement('input', { type: 'submit', value: 'Send GCode', className: 'float-right' })
        )
      )
    );
  }
}
exports.default = Terminal;
//# sourceMappingURL=index.js.map
