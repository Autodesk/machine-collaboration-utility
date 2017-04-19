const _ = require('lodash');

const VirtualBot = require('../Virtual');

const connect = require('./commands/connect');

const info = {
  connectionType: 'serial',
  fileTypes: ['.gcode'],
  vidPid: [
    {
      vid: 0x0403,
      pid: 0x6001,
    },
  ],
  baudrate: 115200,
};

const settings = {
  name: 'KLONER3D',
  model: __dirname.split('/')[__dirname.split('/').length - 1],
};

const commands = {
};

module.exports = {
  info: _.extend(Object.assign({}, VirtualBot.info), info),
  settings: _.extend(Object.assign({}, VirtualBot.settings), settings),
  commands: _.extend(Object.assign({}, VirtualBot.commands), commands),
};
