'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class JogPanel extends _react2.default.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(event) {
    _superagent2.default.post(this.props.endpoint).send({ command: `jog` }).send({ axis: this.props.axis }).send({ amount: this.props.amount }).set('Accept', 'application/json').end();
  }

  render() {
    return _react2.default.createElement('polygon', { fill: this.props.fillColor, onClick: this.handleClick, points: this.props.points, className: 'jog' });
  }
}
exports.default = JogPanel;
//# sourceMappingURL=Polygon.js.map
