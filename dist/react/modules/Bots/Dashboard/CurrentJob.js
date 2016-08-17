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

var _Button = require('react-bootstrap/lib/Button');

var _Button2 = _interopRequireDefault(_Button);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class CurrentJob extends _react2.default.Component {
  constructor(props) {
    super(props);

    this.sendCommand = this.sendCommand.bind(this);
    this.cancelJob = this.cancelJob.bind(this);
  }

  sendCommand(command) {
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command }).set('Accept', 'application/json').end();
  }

  cancelJob() {
    _superagent2.default.post(`/v1/jobs/${ this.props.bot.currentJob.uuid }`).send({ command: `cancel` }).set('Accept', 'application/json').end();
  }

  renderConnectButton() {
    switch (this.props.bot.state) {
      case `unavailable`:
        return _react2.default.createElement(
          _Button2.default,
          { onClick: () => {
              this.sendCommand('checkSubscription');
            } },
          'Detect'
        );
      case `detecting`:
      case `ready`:
      case `startingJob`:
      case `stopping`:
      case `parking`:
      case `unparking`:
      case `connecting`:
        return _react2.default.createElement(
          _Button2.default,
          { onClick: () => {
              this.sendCommand('connect');
            } },
          'Connect'
        );
      default:
        return _react2.default.createElement(
          _Button2.default,
          { onClick: () => {
              this.sendCommand('disconnect');
            } },
          'Disconnect'
        );
    }
  }

  renderPauseButton() {
    if (this.props.bot.currentJob === undefined) {
      return _react2.default.createElement(
        _Button2.default,
        { disabled: true },
        'Pause/Resume'
      );
    }

    switch (this.props.bot.currentJob.state) {
      case `paused`:
        return _react2.default.createElement(
          _Button2.default,
          { onClick: () => {
              this.sendCommand('resume');
            } },
          'Resume'
        );
      case `running`:
        return _react2.default.createElement(
          _Button2.default,
          { onClick: () => {
              this.sendCommand('pause');
            } },
          'Pause'
        );
      default:
        return _react2.default.createElement(
          _Button2.default,
          { disabled: true },
          this.props.bot.currentJob.state
        );
    }
  }

  renderCancelButton() {
    if (this.props.bot.currentJob === undefined) {
      return _react2.default.createElement(
        _Button2.default,
        { bsStyle: 'danger', disabled: true },
        'Cancel'
      );
    }
    return _react2.default.createElement(
      _Button2.default,
      { bsStyle: 'danger', onClick: this.cancelJob },
      'Cancel'
    );
  }

  renderProgressBar() {
    if (this.props.bot.currentJob === undefined) {
      return _react2.default.createElement(_ProgressBar2.default, { now: 0 });
    }
    const percentComplete = this.props.bot.currentJob.percentComplete;
    return _react2.default.createElement(_ProgressBar2.default, { active: true, now: percentComplete, label: `${ percentComplete }%` });
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
          this.renderConnectButton()
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-4' },
          this.renderPauseButton()
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-sm-4' },
          this.renderCancelButton()
        )
      ),
      _react2.default.createElement('br', null),
      this.renderProgressBar()
    );
  }
}
exports.default = CurrentJob;
//# sourceMappingURL=CurrentJob.js.map
