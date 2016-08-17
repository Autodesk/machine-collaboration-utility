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

class HomeAxes extends _react2.default.Component {
  constructor(props) {
    super(props);
  }

  homeAxes(inputAxes) {
    const axes = { x: false, y: false, z: false };
    _underscore2.default.extend(axes, inputAxes);
    let gcode = '';
    if (axes.x && axes.y && axes.z) {
      gcode = 'G28';
    } else if (axes.x && axes.y) {
      gcode = 'G28 X Y';
    } else if (axes.x && axes.z) {
      gcode = 'G28 X Z';
    } else if (axes.y && axes.z) {
      gcode = 'G28 Y Z';
    } else if (axes.x) {
      gcode = 'G28 X';
    } else if (axes.y) {
      gcode = 'G28 Y';
    } else if (axes.z) {
      gcode = 'G28 Z';
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
        'Home!'
      ),
      _react2.default.createElement(
        'div',
        { className: 'row' },
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'button',
            { onClick: () => this.homeAxes({ x: true }) },
            'Home X'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'button',
            { onClick: () => this.homeAxes({ y: true }) },
            'Home Y'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'button',
            { onClick: () => this.homeAxes({ z: true }) },
            'Home Z'
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-3' },
          _react2.default.createElement(
            'button',
            { onClick: () => this.homeAxes({ x: true, y: true, z: true }) },
            'Home All'
          )
        )
      )
    );
  }
}
exports.default = HomeAxes;
//# sourceMappingURL=HomeAxes.js.map
