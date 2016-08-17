'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Temp extends _react2.default.Component {
  constructor(props) {
    super(props);

    this.setTemp = this.setTemp.bind(this);
    this.processGcode = this.processGcode.bind(this);
  }

  setTemp(event) {
    event.preventDefault();

    const endpoint = `/v1/bots/${ this.props.bot.settings.uuid }`;
    const temp = Number(event.target.setpoint.value);

    // Don't update the temp unless the value passed is a number 0 or greater
    if (!Number.isNaN(temp) && temp >= 0) {
      _superagent2.default.post(endpoint).send({ command: `processGcode` }).send({ gcode: `M104 S${ event.target.setpoint.value }` }).set('Accept', 'application/json').end();
    }
  }

  processGcode(gcode) {
    const endpoint = `/v1/bots/${ this.props.bot.settings.uuid }`;

    _superagent2.default.post(endpoint).send({ command: `processGcode` }).send({ gcode }).set('Accept', 'application/json').end();
  }

  renderOnOff() {
    const t0 = this.props.bot.status.sensors.t0 === undefined ? { temperature: '?', setpoint: '?' } : this.props.bot.status.sensors.t0;

    if (Number(t0.setpoint) === 0) {
      return _react2.default.createElement(
        'button',
        { onClick: () => {
            this.processGcode(`M104 S${ this.props.bot.settings.tempE }`);
          } },
        'Turn On (',
        this.props.bot.settings.tempE,
        '℃)'
      );
    } else if (Number(t0.setpoint) > 0 || Number(t0.setpoint < 0)) {
      return _react2.default.createElement(
        'button',
        { onClick: () => {
            this.processGcode(`M104 S0`);
          } },
        'Turn Off (0℃)'
      );
    }
    return _react2.default.createElement(
      'button',
      { disabled: true },
      'On/Off'
    );
  }

  render() {
    const t0 = this.props.bot.status.sensors.t0 === undefined ? { temperature: '?', setpoint: '?' } : this.props.bot.status.sensors.t0;
    return _react2.default.createElement(
      'div',
      { className: 'row' },
      _react2.default.createElement(
        'h3',
        null,
        'TEMPERATURE CONTROL'
      ),
      _react2.default.createElement(
        'div',
        { className: 'col-sm-3' },
        _react2.default.createElement(
          'p',
          null,
          '◯ Extruder'
        )
      ),
      _react2.default.createElement(
        'div',
        { className: 'col-sm-3' },
        _react2.default.createElement(
          'form',
          { onSubmit: this.setTemp },
          _react2.default.createElement(
            'div',
            { className: 'row' },
            _react2.default.createElement('input', { type: 'text', name: 'setpoint', className: 'col-sm-5' }),
            _react2.default.createElement('input', { type: 'submit', value: '*', className: 'col-sm-1' })
          )
        )
      ),
      _react2.default.createElement(
        'div',
        { className: 'col-sm-3' },
        _react2.default.createElement(
          'p',
          null,
          t0.temperature,
          ' / ',
          t0.setpoint
        )
      ),
      _react2.default.createElement(
        'div',
        { className: 'col-sm-3' },
        this.renderOnOff()
      )
    );
  }
}
exports.default = Temp;
//# sourceMappingURL=Temp.js.map
