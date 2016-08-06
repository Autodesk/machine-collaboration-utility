'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class File extends _react2.default.Component {
  constructor(props) {
    super(props);
    this.deleteFile = this.deleteFile.bind(this);
    this.processFile = this.processFile.bind(this);
  }

  deleteFile() {
    _superagent2.default.delete(`/v1/files`).send({ uuid: this.props.file.uuid }).set('Accept', 'application/json').end();
  }

  processFile() {
    this.props.handleProcessFile(this.props.file);
  }

  render() {
    return _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'div',
        null,
        'File UUID: ',
        this.props.file.uuid
      ),
      _react2.default.createElement(
        'div',
        null,
        'File name: ',
        this.props.file.name
      ),
      _react2.default.createElement(
        'button',
        { onClick: this.processFile },
        'Process File'
      ),
      _react2.default.createElement(
        'a',
        { href: `/v1/files/${ this.props.file.uuid }/download` },
        _react2.default.createElement(
          'button',
          null,
          'Download'
        )
      ),
      _react2.default.createElement(
        'button',
        { onClick: this.deleteFile },
        'Delete'
      ),
      _react2.default.createElement('br', null),
      _react2.default.createElement('br', null)
    );
  }
}
exports.default = File;
//# sourceMappingURL=File.js.map
