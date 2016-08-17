'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _NavLink = require('./NavLink');

var _NavLink2 = _interopRequireDefault(_NavLink);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Header extends _react2.default.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return _react2.default.createElement(
      'div',
      { className: 'header' },
      _react2.default.createElement(
        'div',
        { className: 'container' },
        _react2.default.createElement(
          'div',
          { className: 'col-xs-3' },
          _react2.default.createElement(
            _NavLink2.default,
            { to: '/' },
            _react2.default.createElement(
              'div',
              { className: 'logo' },
              _react2.default.createElement('img', { src: 'images/logo.svg' })
            ),
            _react2.default.createElement(
              'h2',
              { className: 'hidden-xs' },
              _react2.default.createElement(
                'span',
                { className: 'bold' },
                'Hydra'
              ),
              _react2.default.createElement(
                'span',
                null,
                'Print'
              )
            )
          )
        ),
        _react2.default.createElement(
          'div',
          { className: 'col-xs-9 float-right' },
          _react2.default.createElement(
            'ul',
            null,
            _react2.default.createElement(
              'li',
              null,
              _react2.default.createElement(
                _NavLink2.default,
                { to: '/' },
                _react2.default.createElement(
                  'span',
                  { className: 'hidden-xs' },
                  'Bots'
                ),
                _react2.default.createElement(
                  'span',
                  { className: 'hidden-sm hidden-md hidden-lg' },
                  _react2.default.createElement('i', { className: 'fa fa-file' })
                )
              )
            ),
            _react2.default.createElement(
              'li',
              null,
              _react2.default.createElement(
                _NavLink2.default,
                { to: '/jobs' },
                _react2.default.createElement(
                  'span',
                  { className: 'hidden-xs' },
                  'Jobs'
                ),
                _react2.default.createElement(
                  'span',
                  { className: 'hidden-sm hidden-md hidden-lg' },
                  _react2.default.createElement('i', { className: 'fa fa-file' })
                )
              )
            ),
            _react2.default.createElement(
              'li',
              null,
              _react2.default.createElement(
                _NavLink2.default,
                { to: '/files' },
                _react2.default.createElement(
                  'span',
                  { className: 'hidden-xs' },
                  'Files'
                ),
                _react2.default.createElement(
                  'span',
                  { className: 'hidden-sm hidden-md hidden-lg' },
                  _react2.default.createElement('i', { className: 'fa fa-file' })
                )
              )
            )
          )
        )
      )
    );
  }
}
exports.default = Header;
//# sourceMappingURL=Header.js.map
