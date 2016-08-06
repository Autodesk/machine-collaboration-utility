'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _Button = require('react-bootstrap/lib/Button');

var _Button2 = _interopRequireDefault(_Button);

var _Modal = require('react-bootstrap/lib/Modal');

var _Modal2 = _interopRequireDefault(_Modal);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _reactRouter = require('react-router');

var _JogPanel = require('./JogPanel');

var _JogPanel2 = _interopRequireDefault(_JogPanel);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Bot extends _react2.default.Component {
  constructor(props) {
    super(props);

    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.toggleModal = this.toggleModal.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.updateBot = this.updateBot.bind(this);
    this.deleteBot = this.deleteBot.bind(this);
    this.detect = this.detect.bind(this);

    this.pauseJob = this.pauseJob.bind(this);
    this.resumeJob = this.resumeJob.bind(this);
    this.cancelJob = this.cancelJob.bind(this);
    this.processGcode = this.processGcode.bind(this);
    this.setTemp = this.setTemp.bind(this);

    this.homeX = this.homeX.bind(this);
    this.homeY = this.homeY.bind(this);
    this.homeZ = this.homeZ.bind(this);
    this.homeAll = this.homeAll.bind(this);

    this.choir = this.choir.bind(this);

    this.state = {
      showModal: false
    };
  }

  detect() {
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command: `checkSubscription` }).end();
  }

  deleteBot() {
    _superagent2.default.delete(`/v1/bots/${ this.props.bot.settings.uuid }`).end();
    this.closeModal();
  }

  pauseJob() {
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command: `pause` }).end();
    this.closeModal();
  }

  resumeJob() {
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command: `resume` }).end();
    this.closeModal();
  }

  cancelJob() {
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command: `cancel` }).end();
    this.closeModal();
  }

  processGcode(event) {
    event.preventDefault();
    const gcode = event.target.gcode.value;
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command: `processGcode` }).send({ gcode }).end();
  }

  setTemp(event) {
    event.preventDefault();
    const temp = event.target.temp.value;
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command: `processGcode` }).send({ gcode: `M104 S${ temp }` }).end();
  }

  homeX(event) {
    event.preventDefault();
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command: `processGcode` }).send({ gcode: `G28 X` }).end();
  }

  homeY(event) {
    event.preventDefault();
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command: `processGcode` }).send({ gcode: `G28 Y` }).end();
  }

  homeZ(event) {
    event.preventDefault();
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command: `processGcode` }).send({ gcode: `G28 Z` }).end();
  }

  homeAll(event) {
    event.preventDefault();
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command: `processGcode` }).send({ gcode: `G28` }).end();
  }

  choir(event) {
    event.preventDefault();
    const gcode = event.target.gcode.value;
    _superagent2.default.post(`/v1/conductor/`).send({ command: `choir` }).send({ gcode }).end();
  }

  connect() {
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command: `connect` }).set('Accept', 'application/json').end();
  }

  disconnect() {
    _superagent2.default.post(`/v1/bots/${ this.props.bot.settings.uuid }`).send({ command: `disconnect` }).set('Accept', 'application/json').end();
  }

  renderConnectButton() {
    switch (this.props.bot.state) {
      case `unavailable`:
        return _react2.default.createElement(
          _Button2.default,
          { style: { margin: "5px" }, onClick: this.detect },
          'Detect'
        );
      case `ready`:
        return _react2.default.createElement(
          _Button2.default,
          { bsStyle: 'success', style: { margin: "5px" }, onClick: this.connect },
          'Connect'
        );
      case `connected`:
        return _react2.default.createElement(
          _Button2.default,
          { bsStyle: 'danger', style: { margin: "5px" }, onClick: this.disconnect },
          'Disconnect'
        );
      default:
        return _react2.default.createElement(
          _Button2.default,
          { style: { margin: "5px" }, disabled: true },
          'Nope!'
        );
    }
  }

  updateBot(event) {
    event.preventDefault();
    let update = _superagent2.default.put(`/v1/bots/${ this.props.bot.settings.uuid }`);
    for (const _ref of Object.entries(this.props.bot.settings)) {
      var _ref2 = _slicedToArray(_ref, 2);

      const settingKey = _ref2[0];
      const setting = _ref2[1];

      const paramJson = {};
      if (event.target[settingKey] !== undefined) {
        paramJson[settingKey] = event.target[settingKey].value;
        update = update.send(paramJson);
      }
    }
    update = update.set('Accept', 'application/json');
    try {
      update.end();
      this.closeModal();
    } catch (ex) {
      console.log(`Update error`, ex);
    }
  }

  toggleModal() {
    this.setState({
      showModal: !this.state.showModal
    });
  }

  closeModal() {
    this.setState({ showModal: false });
  }

  renderModal() {
    return _react2.default.createElement(
      _Modal2.default,
      { show: this.state.showModal, onHide: this.closeModal },
      _react2.default.createElement(
        _Modal2.default.Header,
        { closeButton: true },
        _react2.default.createElement(
          _Modal2.default.Title,
          null,
          'Edit Bot'
        )
      ),
      _react2.default.createElement(
        _Modal2.default.Body,
        null,
        _react2.default.createElement(
          'form',
          { onSubmit: this.updateBot },
          Object.entries(this.props.bot.settings).map(_ref3 => {
            var _ref4 = _slicedToArray(_ref3, 2);

            let settingKey = _ref4[0];
            let setting = _ref4[1];

            switch (settingKey) {
              case `createdAt`:
              case `updatedAt`:
              case `uuid`:
              case `id`:
              case `model`:
                return;
              case `endpoint`:
                if (this.props.botPresets[this.props.bot.settings.model].connectionType === `serial`) {
                  return;
                }
              default:
                return _react2.default.createElement(
                  'div',
                  { key: settingKey },
                  _react2.default.createElement(
                    'label',
                    { key: `${ settingKey }label`, htmlFor: settingKey },
                    settingKey
                  ),
                  _react2.default.createElement('input', { key: `${ settingKey }input`, type: 'textarea', name: settingKey, defaultValue: setting })
                );
            }
          }),
          _react2.default.createElement(
            _Button2.default,
            { bsStyle: 'primary', type: 'submit' },
            'Update Bot'
          )
        )
      ),
      _react2.default.createElement('br', null),
      _react2.default.createElement('br', null),
      _react2.default.createElement('br', null),
      _react2.default.createElement('br', null),
      _react2.default.createElement(
        _Button2.default,
        { bsStyle: 'danger', onClick: this.deleteBot },
        'Delete Bot'
      )
    );
  }

  renderJobButtons() {
    const buttons = [];
    if (this.props.currentJob === undefined) {
      buttons.push(_react2.default.createElement(
        _Button2.default,
        { style: { margin: "5px" }, disabled: true },
        'Nope'
      ));
      buttons.push(_react2.default.createElement(
        _Button2.default,
        { style: { margin: "5px" }, bsStyle: 'danger', disabled: true },
        'Nope'
      ));
    } else {
      switch (this.props.currentJob.state) {
        case `running`:
          buttons.push(_react2.default.createElement(
            _Button2.default,
            { style: { margin: "5px" }, onClick: this.pauseJob },
            'Pause'
          ));
          buttons.push(_react2.default.createElement(
            _Button2.default,
            { style: { margin: "5px" }, bsStyle: 'danger', onClick: this.cancelJob },
            'Cancel'
          ));
          break;
        case `paused`:
          buttons.push(_react2.default.createElement(
            _Button2.default,
            { style: { margin: "5px" }, onClick: this.resumeJob },
            'Resume'
          ));
          buttons.push(_react2.default.createElement(
            _Button2.default,
            { style: { margin: "5px" }, bsStyle: 'danger', onClick: this.cancelJob },
            'Cancel'
          ));
          break;
        default:
          buttons.push(_react2.default.createElement(
            _Button2.default,
            { style: { margin: "5px" }, disabled: true },
            'Nope'
          ));
          buttons.push(_react2.default.createElement(
            _Button2.default,
            { style: { margin: "5px" }, bsStyle: 'danger', disabled: true },
            'Nope'
          ));
          break;
      }
    }
    return buttons;
  }

  checkDisabled() {
    let disabled = false;
    switch (this.props.bot.state) {
      case `detecting`:
      case `ready`:
      case `startingJob`:
      case `stopping`:
      case `parking`:
      case `unparking`:
      case `unavailable`:
      case `connecting`:
        disabled = true;
        break;
      default:
        break;
    }
    return disabled;
  }

  render() {
    return _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'div',
        { className: 'row' },
        _react2.default.createElement(
          'div',
          { className: 'col-md-12' },
          this.renderConnectButton(),
          _react2.default.createElement(
            _Button2.default,
            { style: { margin: "5px" }, onClick: this.toggleModal },
            'Edit Bot'
          ),
          this.renderJobButtons(),
          _react2.default.createElement(_JogPanel2.default, { endpoint: `/v1/bots/${ this.props.bot.settings.uuid }` }),
          _react2.default.createElement(
            _Button2.default,
            { onClick: this.homeX, disabled: this.checkDisabled() },
            'Home X'
          ),
          _react2.default.createElement(
            _Button2.default,
            { onClick: this.homeY, disabled: this.checkDisabled() },
            'Home Y'
          ),
          _react2.default.createElement(
            _Button2.default,
            { onClick: this.homeZ, disabled: this.checkDisabled() },
            'Home Z'
          ),
          _react2.default.createElement(
            _Button2.default,
            { onClick: this.homeAll, disabled: this.checkDisabled() },
            'Home Axes'
          ),
          _react2.default.createElement(
            'div',
            { className: 'clearfix' },
            _react2.default.createElement(
              'div',
              { style: { float: 'left', margin: '0px 5px 5px 5px' } },
              _react2.default.createElement(
                'form',
                { onSubmit: this.processGcode },
                _react2.default.createElement('input', { type: 'textarea', name: 'gcode', disabled: this.checkDisabled() }),
                _react2.default.createElement('br', null),
                _react2.default.createElement('input', { type: 'submit', value: 'Send Gcode', disabled: this.checkDisabled() })
              )
            ),
            _react2.default.createElement(
              'div',
              { style: { float: 'left', margin: '0px 5px 5px 5px' } },
              _react2.default.createElement(
                'form',
                { onSubmit: this.setTemp },
                _react2.default.createElement('input', { type: 'textarea', name: 'temp', disabled: this.checkDisabled() }),
                _react2.default.createElement('br', null),
                _react2.default.createElement('input', { type: 'submit', value: 'Set Extruder Temp', disabled: this.checkDisabled() })
              )
            )
          ),
          _react2.default.createElement(
            'div',
            null,
            'State: ',
            this.props.bot.state,
            '  Port: ',
            this.props.bot.port
          ),
          _react2.default.createElement(
            'div',
            null,
            'Job State: ',
            this.props.currentJob === undefined ? `Not processing job` : `${ this.props.currentJob.state }. ${ this.props.currentJob.percentComplete }%`
          ),
          _react2.default.createElement(
            'div',
            null,
            'Temp:',
            this.props.bot.status.sensors.t0 ? this.props.bot.status.sensors.t0 : '?'
          ),
          _react2.default.createElement(
            'div',
            null,
            'X:',
            `${ this.props.bot.status.position.x } `,
            'Y:',
            `${ this.props.bot.status.position.y } `,
            'Z:',
            `${ this.props.bot.status.position.z } `,
            'E:',
            `${ this.props.bot.status.position.e } `
          ),
          this.props.conducting ? _react2.default.createElement(
            'form',
            { onSubmit: this.choir },
            _react2.default.createElement(
              'h3',
              null,
              'Jog alll the bots'
            ),
            _react2.default.createElement('input', { type: 'textarea', name: 'gcode', placeholder: 'Enter Gcode Here' }),
            _react2.default.createElement('br', null),
            _react2.default.createElement('input', { type: 'submit', value: 'Send Gcode to all bots' })
          ) : ``
        )
      ),
      this.renderModal()
    );
  }
}
exports.default = Bot;
//# sourceMappingURL=Bot.js.map
