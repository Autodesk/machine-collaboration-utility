'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _Header = require('./modules/Header');

var _Header2 = _interopRequireDefault(_Header);

var _reactDropzone = require('react-dropzone');

var _reactDropzone2 = _interopRequireDefault(_reactDropzone);

var _superagent = require('superagent');

var _superagent2 = _interopRequireDefault(_superagent);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* global APP_VAR, io */

class App extends _react2.default.Component {
  constructor(props) {
    super(props);
    try {
      this.state = APP_VAR;
    } catch (ex) {
      this.state = props.params;
    }
    this.openDropzone = this.openDropzone.bind(this);
  }

  componentDidMount() {
    // Don't notice socket event on the server side
    if (require('is-browser')) {
      this.socket = io();
      this.socket.on('botEvent', bot => {
        const newBots = this.state.bots;
        switch (bot.event) {
          case `new`:
          case `update`:
            newBots[bot.uuid] = bot.data;
            this.setState({ bots: newBots });
            break;
          case `delete`:
            delete newBots[bot.uuid];
            this.setState({ bots: newBots });
            break;
          default:
            break;
        }
      });
      this.socket.on('fileEvent', file => {
        const newFiles = this.state.files;
        switch (file.event) {
          case `new`:
            newFiles[file.uuid] = file.data;
            this.setState({ files: newFiles });
            break;
          case `delete`:
            delete newFiles[file.uuid];
            this.setState({ files: newFiles });
            break;
          default:
            break;
        }
      });
      this.socket.on('jobEvent', job => {
        const newJobs = this.state.jobs;
        const newBots = this.state.bots;
        switch (job.event) {
          case `new`:
          case `update`:
            newJobs[job.uuid] = job.data;
            try {
              newBots[job.data.botUuid].currentJob = job.data;
            } catch (ex) {
              console.log(`Failed to update bots from job event`, ex);
            }
            this.setState({
              jobs: newJobs,
              bots: newBots
            });
            break;
          case `delete`:
            delete newJobs[job.uuid];
            this.setState({ jobs: newJobs });
            break;
          default:
            break;
        }
      });
    }
  }

  onDrop(files) {
    const req = _superagent2.default.post('/v1/files');
    files.forEach(file => {
      req.attach(file.name, file);
    });
    req.end(() => {
      // Called after the file is uploaded
    });
  }

  openDropzone() {
    this.refs.dropzone.open();
  }

  render() {
    const dropzoneStyle = {
      width: `100%`,
      height: `100%`
    };
    const childrenComponents = _react2.default.Children.map(this.props.children, child => {
      // mapping through all of the children components in order to inject hydraPrint app objects
      return _react2.default.cloneElement(child, Object.assign({}, this.state, { dropzoneOpener: this.openDropzone }));
    });
    return _react2.default.createElement(
      _reactDropzone2.default,
      {
        ref: 'dropzone',
        style: dropzoneStyle,
        onDrop: this.onDrop,
        disableClick: true
      },
      _react2.default.createElement(_Header2.default, null),
      childrenComponents
    );
  }
}
exports.default = App;
//# sourceMappingURL=App.js.map
