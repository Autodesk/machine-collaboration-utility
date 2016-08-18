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

    this.setNozzleTemp = this.setNozzleTemp.bind(this);
    this.setBedTemp = this.setBedTemp.bind(this);
    this.processGcode = this.processGcode.bind(this);
  }

  setNozzleTemp(event) {
    event.preventDefault();

    const endpoint = `/v1/bots/${ this.props.bot.settings.uuid }`;
    const temp = Number(event.target.setpoint.value);

    // Don't update the temp unless the value passed is a number 0 or greater
    if (!Number.isNaN(temp) && temp >= 0) {
      _superagent2.default.post(endpoint).send({ command: `processGcode` }).send({ gcode: `M104 S${ event.target.setpoint.value }` }).set('Accept', 'application/json').end();
    }
  }

  setBedTemp(event) {
    event.preventDefault();

    const endpoint = `/v1/bots/${ this.props.bot.settings.uuid }`;
    const temp = Number(event.target.setpoint.value);

    // Don't update the temp unless the value passed is a number 0 or greater
    if (!Number.isNaN(temp) && temp >= 0) {
      _superagent2.default.post(endpoint).send({ command: `processGcode` }).send({ gcode: `M140 S${ event.target.setpoint.value }` }).set('Accept', 'application/json').end();
    }
  }

  processGcode(gcode) {
    const endpoint = `/v1/bots/${ this.props.bot.settings.uuid }`;

    _superagent2.default.post(endpoint).send({ command: `processGcode` }).send({ gcode }).set('Accept', 'application/json').end();
  }

  renderNozzleOnOff() {
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

  renderBedOnOff() {
    const b0 = this.props.bot.status.sensors.b0 === undefined ? { temperature: '?', setpoint: '?' } : this.props.bot.status.sensors.b0;

    if (Number(b0.setpoint) === 0) {
      return _react2.default.createElement(
        'button',
        { onClick: () => {
            this.processGcode(`M140 S${ this.props.bot.settings.tempB }`);
          } },
        'Turn On (',
        this.props.bot.settings.tempB,
        '℃)'
      );
    } else if (Number(b0.setpoint) > 0 || Number(b0.setpoint < 0)) {
      return _react2.default.createElement(
        'button',
        { onClick: () => {
            this.processGcode(`M140 S0`);
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
    const t0Disabled = this.props.bot.status.sensors.t0 === undefined || Number.isNaN(Number(this.props.bot.status.sensors.t0.setpoint));
    const b0Disabled = this.props.bot.status.sensors.b0 === undefined || Number.isNaN(Number(this.props.bot.status.sensors.b0.setpoint));

    const t0 = t0Disabled ? { temperature: '?', setpoint: '?' } : this.props.bot.status.sensors.t0;
    const b0 = b0Disabled ? { temperature: '?', setpoint: '?' } : this.props.bot.status.sensors.b0;
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
        { className: 'row' },
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
            { onSubmit: this.setNozzleTemp },
            _react2.default.createElement(
              'div',
              { className: 'row' },
              _react2.default.createElement('input', { type: 'text', name: 'setpoint', className: 'col-sm-5', disabled: t0Disabled }),
              _react2.default.createElement('input', { type: 'submit', value: '*', className: 'col-sm-1', disabled: t0Disabled })
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
          this.renderNozzleOnOff()
        )
      ),
      _react2.default.createElement(
        'div',
        { className: 'row' },
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'p',
            null,
            '◯ Bed'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'form',
            { onSubmit: this.setBedTemp },
            _react2.default.createElement(
              'div',
              { className: 'row' },
              _react2.default.createElement('input', { type: 'text', name: 'setpoint', className: 'col-sm-5', disabled: b0Disabled }),
              _react2.default.createElement('input', { type: 'submit', value: '*', className: 'col-sm-1', disabled: b0Disabled })
            )
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'p',
            null,
            b0.temperature,
            ' / ',
            b0.setpoint
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          this.renderBedOnOff()
        )
      )
    );
  }
}
exports.default = Temp;
//# sourceMappingURL=Temp.js.map
