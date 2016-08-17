'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _Button = require('react-bootstrap/lib/Button');

var _Button2 = _interopRequireDefault(_Button);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Settings extends _react2.default.Component {
  constructor(props) {
    super(props);

    this.updateBotSettings = this.updateBotSettings.bind(this);
    this.deleteBot = this.deleteBot.bind(this);
  }

  updateBotSettings(event) {
    event.preventDefault();
    let update = _superagent2.default.put(`/v1/bots/${ this.props.bot.settings.uuid }`);
    for (const _ref of _underscore2.default.pairs(this.props.bot.settings)) {
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
    } catch (ex) {
      console.log(`Update error`, ex);
    }
  }

  renderSettingsForm() {
    const settings = [];
    for (const _ref3 of _underscore2.default.pairs(this.props.bot.settings)) {
      var _ref4 = _slicedToArray(_ref3, 2);

      const settingKey = _ref4[0];
      const setting = _ref4[1];

      switch (settingKey) {
        case `createdAt`:
        case `updatedAt`:
        case `uuid`:
        case `id`:
        case `model`:
          break;
        case `endpoint`:
          if (String(setting) === `false`) {
            break;
          }
        default:
          settings.push(this.renderSettingInput(settingKey, setting));
      }
    }
    settings.push(_react2.default.createElement('input', { type: 'submit', value: 'Update!' }));
    return _react2.default.createElement(
      'form',
      { onSubmit: this.updateBotSettings },
      settings
    );
  }

  renderSettingInput(settingKey, setting) {
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

  deleteBot() {
    _superagent2.default.delete(`/v1/bots/${ this.props.bot.settings.uuid }`).end();
  }

  render() {
    const settingsForm = this.renderSettingsForm();
    return _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'h3',
        null,
        'Settings'
      ),
      settingsForm,
      _react2.default.createElement(
        _Button2.default,
        { bsStyle: 'danger', onClick: this.deleteBot },
        'Delete Bot'
      )
    );
  }
}
exports.default = Settings;
//# sourceMappingURL=index.js.map
