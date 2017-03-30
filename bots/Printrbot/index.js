const _ = require('lodash');

const VirtualBot = require('../Virtual');

const info = {
  connectionType: 'serial',
  fileTypes: ['.gcode'],
  vidPid: [
    {
      vid: 0x16C0,
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
};

const settings = {
  name: 'Printrbot',
  model: __dirname.split('/')[__dirname.split('/').length - 1],
};

const commands = {

};

module.exports = {
  info: _.extend(Object.assign({}, VirtualBot.info), info),
  settings: _.extend(Object.assign({}, VirtualBot.settings), settings),
  commands: _.extend(Object.assign({}, VirtualBot.commands), commands),
};
