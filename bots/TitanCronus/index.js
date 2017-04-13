const _ = require('lodash');

const VirtualBot = require('../Virtual');

const connect = require('./commands/connect');
const block = require('./commands/block');
const unblock = require('./commands/unblock');

const info = {
  connectionType: 'serial',
  fileTypes: ['.gcode'],
  vidPid: [
    {
      vid: 0x1D50,
      pid: 0x6015,
    },
  ],
  baudrate: 230400,
};

const settings = {
  name: 'Cronus Bot',
  model: __dirname.split('/')[__dirname.split('/').length - 1],
};

const commands = {
  connect,
  block,
  unblock,
};

module.exports = {
  info: _.extend(Object.assign({}, VirtualBot.info), info),
  settings: _.extend(Object.assign({}, VirtualBot.settings), settings),
  commands: _.extend(Object.assign({}, VirtualBot.commands), commands),
};
