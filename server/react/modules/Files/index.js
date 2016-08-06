'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _Modal = require('react-bootstrap/lib/Modal');

var _Modal2 = _interopRequireDefault(_Modal);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

var _File = require('./File');

var _File2 = _interopRequireDefault(_File);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Files extends _react2.default.Component {
  constructor(props) {
    super(props);

    // grab the first bot that is available to process a job
    let initialBotUuid = undefined;

    this.state = {
      showModal: false,
      botUuid: this.getActiveBotUuid(props)
    };
    this.handleProcessFile = this.handleProcessFile.bind(this);
    this.close = this.close.bind(this);
    this.startJob = this.startJob.bind(this);
    this.change = this.change.bind(this);
  }

  handleProcessFile(fileInfo) {
    this.setState({
      showModal: true,
      fileUuid: fileInfo.uuid,
      fileName: fileInfo.name
    });
  }

  close() {
    this.setState({ showModal: false });
  }

  change(event) {
    this.setState({ botUuid: event.target.value });
  }

  componentWillReceiveProps(newProps) {
    this.setState({
      botUuid: this.getActiveBotUuid(newProps)
    });
  }

  getActiveBotUuid(props) {
    if (props.conducting) {
      return -1;
    }
    for (const _ref of Object.entries(this.props.bots)) {
      var _ref2 = _slicedToArray(_ref, 2);

      const botUuid = _ref2[0];
      const bot = _ref2[1];

      // Only allow jobs to be stared on a bot in the state "connected"
      if (bot.state !== `connected`) {
        continue;
      }
      return botUuid;
    }
    return undefined;
  }

  createBotList() {
    const options = [];
    if (this.props.conducting) {
      options.unshift(_react2.default.createElement(
        'option',
        { key: -1, value: -1 },
        'Conductor'
      ));
    }
    Object.entries(this.props.bots).map(_ref3 => {
      var _ref4 = _slicedToArray(_ref3, 2);

      let botUuid = _ref4[0];
      let bot = _ref4[1];

      // Only allow jobs to be stared on a bot in the state "connected"
      if (bot.state !== `connected`) {
        return;
      }
      options.push(_react2.default.createElement(
        'option',
        { key: botUuid, value: botUuid },
        bot.settings.name
      ));
    });
    return _react2.default.createElement(
      'select',
      { name: 'botList', onChange: this.change, form: 'newJobForm' },
      options
    );
  }

  startJob() {
    // Create a job
    const requestParams = {
      fileUuid: this.state.fileUuid,
      botUuid: this.state.botUuid,
      startJob: true
    };

    _superagent2.default.post(`/v1/jobs`).send(requestParams).set('Accept', 'application/json').end();
    this.close();
  }

  renderModal() {
    return _react2.default.createElement(
      _Modal2.default,
      { show: this.state.showModal, onHide: this.close },
      _react2.default.createElement(
        _Modal2.default.Header,
        { closeButton: true },
        _react2.default.createElement(
          _Modal2.default.Title,
          null,
          'Modal heading'
        )
      ),
      _react2.default.createElement(
        _Modal2.default.Body,
        null,
        _react2.default.createElement(
          'div',
          null,
          this.state.fileUuid
        ),
        _react2.default.createElement(
          'div',
          null,
          this.state.fileName
        ),
        this.createBotList(),
        _react2.default.createElement(
          'button',
          { onClick: this.startJob },
          'Start Job'
        )
      ),
      _react2.default.createElement(
        _Modal2.default.Footer,
        null,
        _react2.default.createElement(
          'button',
          { onClick: this.close },
          'Close'
        )
      )
    );
  }

  render() {
    const files = Object.entries(this.props.files).map(_ref5 => {
      var _ref6 = _slicedToArray(_ref5, 2);

      let fileKey = _ref6[0];
      let file = _ref6[1];

      return _react2.default.createElement(_File2.default, { key: file.uuid, file: file, handleProcessFile: this.handleProcessFile });
    });
    return _react2.default.createElement(
      'div',
      null,
      this.renderModal(),
      _react2.default.createElement(
        'h1',
        null,
        'Files'
      ),
      _react2.default.createElement(
        'button',
        { onClick: this.props.dropzoneOpener },
        'Upload File'
      ),
      _react2.default.createElement('br', null),
      _react2.default.createElement('br', null),
      _react2.default.createElement(
        'div',
        null,
        files
      )
    );
  }
}
exports.default = Files;
//# sourceMappingURL=index.js.map
