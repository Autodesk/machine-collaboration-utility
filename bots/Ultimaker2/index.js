const path = require('path');
const _ = require('lodash');

const VirtualBot = require('../Virtual');

const connect = require('./commands/connect');
const generateParkCommands = require('./commands/generateParkCommands');
const generateUnparkCommands = require('./commands/generateUnparkCommands');

const info = {
  connectionType: 'serial',
  fileTypes: ['.gcode'],
  vidPid: [
    {
      vid: 0x2341,
      pid: 0x0010,
    },
  ],
  baudrate: 250000,
  checksumSupport: false,
};

const settings = {
  name: 'Ultimaker 2',
  tempE: 220,
  tempB: 55,
  model: 'Ultimaker2',
};

const commands = {
  connect,
  generateParkCommands,
  generateUnparkCommands,
};

module.exports = {
  info: _.extend(Object.assign({}, VirtualBot.info), info),
  settings: _.extend(Object.assign({}, VirtualBot.settings), settings),
  commands: _.extend(Object.assign({}, VirtualBot.commands), commands),
};
