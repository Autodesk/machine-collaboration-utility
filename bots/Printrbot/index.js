const path = require('path');
const _ = require('lodash');

const VirtualBot = require('../Virtual');

const info = {
  connectionType: 'serial',
  fileTypes: ['.gcode'],
  vidPid: [
    {
      vid: 0x16c0,
      pid: 0x0483,
    },
    {
      vid: 0x2974,
      pid: 0x0620,
    },
    {
      vid: 0x2974,
      pid: 0x0610,
    },
  ],
  baudrate: 230400,
  checksumSupport: false,
};

const settings = {
  name: 'Printrbot',
  model: 'Printrbot',
};

const commands = {};

module.exports = {
  info: _.extend(Object.assign({}, VirtualBot.info), info),
  settings: _.extend(Object.assign({}, VirtualBot.settings), settings),
  commands: _.extend(Object.assign({}, VirtualBot.commands), commands),
};
