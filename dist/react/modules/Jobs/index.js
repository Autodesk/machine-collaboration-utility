'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _Job = require('./Job');

var _Job2 = _interopRequireDefault(_Job);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Jobs extends _react2.default.Component {
  constructor(props) {
    super(props);
    this.state = {
      jobs: this.props.jobs
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ jobs: nextProps.jobs });
  }

  render() {
    const jobs = _underscore2.default.pairs(this.state.jobs).map(_ref => {
      var _ref2 = _slicedToArray(_ref, 2);

      let jobKey = _ref2[0];
      let job = _ref2[1];

      return _react2.default.createElement(_Job2.default, { key: job.uuid, job: job });
    });
    return _react2.default.createElement(
      'div',
      null,
      _react2.default.createElement(
        'h1',
        null,
        'Jobs'
      ),
      jobs
    );
  }
}
exports.default = Jobs;
//# sourceMappingURL=index.js.map
