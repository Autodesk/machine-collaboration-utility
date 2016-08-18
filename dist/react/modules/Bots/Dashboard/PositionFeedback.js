'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class PositionFeedback extends _react2.default.Component {
  constructor(props) {
    super(props);

    this.zeroAxis = this.zeroAxis.bind(this);
  }

  zeroAxis(inputAxes) {
    const endpoint = `/v1/bots/${ this.props.bot.settings.uuid }`;

    const axes = { x: false, y: false, z: false };
    _underscore2.default.extend(axes, inputAxes);
    let gcode = '';
    if (axes.x) {
      gcode = 'G92 X0';
    } else if (axes.y) {
      gcode = 'G92 Y0';
    } else if (axes.z) {
      gcode = 'G92 Z0';
    }

    _superagent2.default.post(endpoint).send({ command: `processGcode` }).send({ gcode }).set('Accept', 'application/json').end();
  }

  render() {
    const position = this.props.bot.status && this.props.bot.status.position ? this.props.bot.status.position : { x: '?', y: '?', z: '?', e: '?' };
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
          Number(position.x) - Number(this.props.bot.settings.offsetX)
        ),
        _react2.default.createElement(
          'button',
          { onClick: () => {
              this.zeroAxis({ x: true });
            } },
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
          Number(position.y) - Number(this.props.bot.settings.offsetY)
        ),
        _react2.default.createElement(
          'button',
          { onClick: () => {
              this.zeroAxis({ y: true });
            } },
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
          Number(position.z) - Number(this.props.bot.settings.offsetZ)
        ),
        _react2.default.createElement(
          'button',
          { onClick: () => {
              this.zeroAxis({ z: true });
            } },
          'Zero Z'
        )
      )
    );
  }
}
exports.default = PositionFeedback;
//# sourceMappingURL=PositionFeedback.js.map
