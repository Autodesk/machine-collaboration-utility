'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Job extends _react2.default.Component {
  constructor(props) {
    super(props);
    this.state = {
      job: props.job
    };
    this.handleClick = this.handleClick.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ job: nextProps.job });
  }

  handleClick() {
    _superagent2.default.delete(`/v1/jobs`).send({ uuid: this.state.job.uuid }).set('Accept', 'application/json').end();
  }
  render() {
    return _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'div',
        null,
        'Job UUID: ',
        this.state.job.uuid
      ),
      _react2.default.createElement(
        'div',
        null,
        'Job State: ',
        this.state.job.state,
        ', ',
        this.state.job.percentComplete
      ),
      _react2.default.createElement(
        'button',
        { onClick: this.handleClick },
        'Delete Job'
      ),
      _react2.default.createElement('br', null),
      _react2.default.createElement('br', null)
    );
  }
}
exports.default = Job;
//# sourceMappingURL=Job.js.map
