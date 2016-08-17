'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _Modal = require('react-bootstrap/lib/Modal');

var _Modal2 = _interopRequireDefault(_Modal);

var _FormGroup = require('react-bootstrap/lib/FormGroup');

var _FormGroup2 = _interopRequireDefault(_FormGroup);

var _Radio = require('react-bootstrap/lib/Radio');

var _Radio2 = _interopRequireDefault(_Radio);

var _Button = require('react-bootstrap/lib/Button');

var _Button2 = _interopRequireDefault(_Button);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _Bot = require('./Bot');

var _Bot2 = _interopRequireDefault(_Bot);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Bots extends _react2.default.Component {
  constructor(props) {
    super(props);
    this.toggleModal = this.toggleModal.bind(this);
    this.addBot = this.addBot.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.updateSelectedPreset = this.updateSelectedPreset.bind(this);
    this.handleSelectBot = this.handleSelectBot.bind(this);
    this.updateText = this.updateText.bind(this);

    this.state = {
      showModal: false,
      selectedBot: _underscore2.default.pairs(props.bots).length > 0 ? _underscore2.default.pairs(props.bots)[0][0] : undefined,
      selectedPreset: _underscore2.default.pairs(props.botPresets)[0][1]
    };
  }

  updateText(event) {
    const newPreset = Object.assign({}, this.state.selectedPreset);
    newPreset.settings[event.target.name] = event.target.value;
    this.setState({ selectedPreset: newPreset });
  }

  handleSelectBot(event) {
    this.setState({
      selectedBot: event.target.value
    });
  }

  createBot(bot) {
    return _react2.default.createElement(
      'div',
      null,
      bot.settings.name
    );
  }

  toggleModal() {
    this.setState({
      showModal: !this.state.showModal
    });
  }

  closeModal() {
    this.setState({ showModal: false });
  }

  renderBotList() {
    let defaultSet = false;
    const botRadioList = _underscore2.default.pairs(this.props.bots).map(_ref => {
      var _ref2 = _slicedToArray(_ref, 2);

      let botUuid = _ref2[0];
      let bot = _ref2[1];

      const radioElement = _react2.default.createElement(
        _Radio2.default,
        { inline: true, key: botUuid, name: 'botList', defaultValue: botUuid, checked: this.state.selectedBot === botUuid },
        bot.settings.name
      );
      if (!defaultSet) {
        defaultSet = true;
      }
      return radioElement;
    });
    botRadioList.push(_react2.default.createElement(
      _Button2.default,
      { key: 'createBot', onClick: this.toggleModal },
      'Create Bot'
    ));
    return _react2.default.createElement(
      _FormGroup2.default,
      { onChange: this.handleSelectBot },
      botRadioList
    );
  }

  updateSelectedPreset(event) {
    this.setState({ selectedPreset: this.props.botPresets[event.target.value] });
  }

  createPresetList() {
    const options = _underscore2.default.pairs(this.props.botPresets).map(_ref3 => {
      var _ref4 = _slicedToArray(_ref3, 2);

      let botPresetKey = _ref4[0];
      let botPreset = _ref4[1];

      switch (botPreset.info.connectionType) {
        case undefined:
        case `serial`:
          return;
        default:
          break;
      }
      return _react2.default.createElement(
        'option',
        { key: botPresetKey, value: botPresetKey },
        botPreset.settings.name
      );
    });
    return _react2.default.createElement(
      'select',
      { onChange: this.updateSelectedPreset, name: 'botList', form: 'newBotForm' },
      options
    );
  }

  renderEndpoint(connectionType) {
    switch (connectionType) {
      case 'hydraprint':
      case 'telnet':
      case 'virtual':
        return _react2.default.createElement(
          'div',
          null,
          _react2.default.createElement(
            'label',
            { htmlFor: 'endpoint' },
            'Endpoint'
          ),
          _react2.default.createElement('input', { onChange: this.updateText, type: 'textarea', name: 'endpoint', defaultValue: 'http://127.0.0.1' }),
          _react2.default.createElement('br', null)
        );
      default:
        return _react2.default.createElement('input', { type: 'hidden', name: 'endpoint', value: undefined });
    }
  }

  createNewBotForm() {
    return _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement('input', { type: 'hidden', name: 'model', value: this.state.selectedPreset.settings.model }),
      _react2.default.createElement(
        'label',
        { htmlFor: 'name' },
        'Name'
      ),
      _react2.default.createElement('input', { onChange: this.updateText, type: 'textarea', name: 'name', value: this.state.selectedPreset.settings.name }),
      _react2.default.createElement('br', null),
      this.renderEndpoint(this.state.selectedPreset.info.connectionType),
      _react2.default.createElement(
        'label',
        { htmlFor: 'jogXSpeed' },
        'Jog Speed X'
      ),
      _react2.default.createElement('input', { onChange: this.updateText, type: 'textarea', name: 'jogXSpeed', value: this.state.selectedPreset.settings.jogXSpeed }),
      _react2.default.createElement('br', null),
      _react2.default.createElement(
        'label',
        { htmlFor: 'jogYSpeed' },
        'Jog Speed Y'
      ),
      _react2.default.createElement('input', { onChange: this.updateText, type: 'textarea', name: 'jogYSpeed', value: this.state.selectedPreset.settings.jogYSpeed }),
      _react2.default.createElement('br', null),
      _react2.default.createElement(
        'label',
        { htmlFor: 'jogZSpeed' },
        'Jog Speed Z'
      ),
      _react2.default.createElement('input', { onChange: this.updateText, type: 'textarea', name: 'jogZSpeed', value: this.state.selectedPreset.settings.jogZSpeed }),
      _react2.default.createElement('br', null),
      _react2.default.createElement(
        'label',
        { htmlFor: 'jogESpeed' },
        'Jog Speed E'
      ),
      _react2.default.createElement('input', { onChange: this.updateText, type: 'textarea', name: 'jogESpeed', value: this.state.selectedPreset.settings.jogESpeed }),
      _react2.default.createElement('br', null),
      _react2.default.createElement(
        'label',
        { htmlFor: 'tempE' },
        'Default Extruder Temp'
      ),
      _react2.default.createElement('input', { onChange: this.updateText, type: 'textarea', name: 'tempE', value: this.state.selectedPreset.settings.tempE }),
      _react2.default.createElement('br', null),
      _react2.default.createElement(
        'label',
        { htmlFor: 'tempB' },
        'Default Bed Temp'
      ),
      _react2.default.createElement('input', { onChange: this.updateText, type: 'textarea', name: 'tempB', value: this.state.selectedPreset.settings.tempB }),
      _react2.default.createElement('br', null),
      _react2.default.createElement('input', { type: 'hidden', name: 'speedRatio', value: this.state.selectedPreset.settings.speedRatio }),
      _react2.default.createElement('input', { type: 'hidden', name: 'eRatio', value: this.state.selectedPreset.settings.eRatio }),
      _react2.default.createElement('input', { type: 'hidden', name: 'offsetX', value: this.state.selectedPreset.settings.offsetX }),
      _react2.default.createElement('input', { type: 'hidden', name: 'offsetY', value: this.state.selectedPreset.settings.offsetY }),
      _react2.default.createElement('input', { type: 'hidden', name: 'offsetZ', value: this.state.selectedPreset.settings.offsetZ })
    );
  }

  addBot(event) {
    this.closeModal();
    event.preventDefault();

    _superagent2.default.post(`/v1/bots`).send({ name: event.target.name.value }).send({ model: event.target.model.value }).send({ endpoint: event.target.endpoint.value }).send({ jogXSpeed: event.target.jogXSpeed.value }).send({ jogYSpeed: event.target.jogYSpeed.value }).send({ jogZSpeed: event.target.jogZSpeed.value }).send({ jogESpeed: event.target.jogESpeed.value }).send({ tempE: event.target.tempE.value }).send({ tempB: event.target.tempB.value }).send({ speedRatio: event.target.speedRatio.value }).send({ eRatio: event.target.eRatio.value }).send({ offsetX: event.target.offsetX.value }).send({ offsetY: event.target.offsetY.value }).send({ offsetZ: event.target.offsetZ.value }).set('Accept', 'application/json').end();
  }

  componentWillReceiveProps(nextProps) {
    let newBotState = this.state.selectedBot;
    if (_underscore2.default.pairs(nextProps.bots).length <= 0) {
      newBotState = undefined;
    } else {
      if (nextProps.bots[this.state.selectedBot] === undefined) {
        newBotState = _underscore2.default.pairs(nextProps.bots).length > 0 ? _underscore2.default.pairs(nextProps.bots)[0][0] : undefined;
      }
    }
    if (this.state.selectedBot !== newBotState) {
      this.setState({ selectedBot: newBotState });
    }
  }

  render() {
    let selectedBot;
    let currentJob;
    if (this.state.selectedBot === undefined) {
      selectedBot = undefined;
      currentJob = undefined;
    } else {
      selectedBot = this.props.bots[this.state.selectedBot];
      currentJob = selectedBot.currentJob === undefined ? undefined : selectedBot.currentJob;
    }

    const daBot = this.state.selectedBot === undefined ? '' : _react2.default.createElement(_Bot2.default, { currentJob: currentJob, conducting: this.props.conducting, botPresets: this.props.botPresets, bot: selectedBot });

    return _react2.default.createElement(
      'div',
      null,
      this.renderBotList(),
      daBot,
      _react2.default.createElement(
        _Modal2.default,
        { show: this.state.showModal, onHide: this.closeModal },
        _react2.default.createElement(
          _Modal2.default.Header,
          { closeButton: true },
          _react2.default.createElement(
            _Modal2.default.Title,
            null,
            'Create Bot'
          )
        ),
        _react2.default.createElement(
          _Modal2.default.Body,
          null,
          this.createPresetList(),
          _react2.default.createElement(
            'form',
            { onSubmit: this.addBot },
            this.createNewBotForm(),
            _react2.default.createElement('input', { type: 'submit', value: 'Create Bot' })
          )
        )
      )
    );
  }
}
exports.default = Bots;
//# sourceMappingURL=index.js.map
