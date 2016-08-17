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

class DisableMotors extends _react2.default.Component {
  constructor(props) {
    super(props);
  }

  disableAxes(inputAxes) {
    const axes = { x: false, y: false, z: false, e: false };
    _underscore2.default.extend(axes, inputAxes);
    let gcode = '';
    // WARNING. not checking to see if more than 2, less than all axes are to be disabled
    if (axes.x && axes.y && axes.z && axes.e) {
      gcode = 'M84';
    } else if (axes.x) {
      gcode = 'M84 X';
    } else if (axes.y) {
      gcode = 'M84 Y';
    } else if (axes.z) {
      gcode = 'M84 Z';
    } else if (axes.e) {
      gcode = 'M84 E';
    }

    _superagent2.default.post(this.props.endpoint).send({ command: `processGcode` }).send({ gcode }).set('Accept', 'application/json').end();
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
            { onClick: () => this.disableAxes({ x: true }) },
            'X'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'button',
            { onClick: () => this.disableAxes({ y: true }) },
            'Y'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'button',
            { onClick: () => this.disableAxes({ z: true }) },
            'Z'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'button',
            { onClick: () => this.disableAxes({ e: true }) },
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
            { onClick: () => this.disableAxes({ x: true, y: true, z: true, e: true }) },
            'All'
          )
        )
      )
    );
  }
}
exports.default = DisableMotors;
//# sourceMappingURL=DisableMotors.js.map
