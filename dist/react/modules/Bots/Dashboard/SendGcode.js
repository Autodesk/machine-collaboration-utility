'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class SendGcode extends _react2.default.Component {
  constructor(props) {
    super(props);

    this.processGcode = this.processGcode.bind(this);
  }

  processGcode(event) {
    event.preventDefault();
    const gcode = event.target.gcode.value;

    _superagent2.default.post(this.props.endpoint).send({ command: `processGcode` }).send({ gcode }).set('Accept', 'application/json').end();
  }

  render() {
    return _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'h3',
        null,
        'SEND GCODE'
      ),
      _react2.default.createElement(
        'form',
        { onSubmit: this.processGcode },
        _react2.default.createElement(
          'div',
          { className: 'row' },
          _react2.default.createElement(
            'div',
            { className: 'col-sm-9' },
            _react2.default.createElement('input', { type: 'text', name: 'gcode' })
          ),
          _react2.default.createElement(
            'div',
            { className: 'col-sm-3' },
            _react2.default.createElement('input', { type: 'submit', value: 'SEND GCODE' })
          )
        )
      )
    );
  }
}
exports.default = SendGcode;
//# sourceMappingURL=SendGcode.js.map
