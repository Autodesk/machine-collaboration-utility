const _ = require('lodash');

const VirtualBot = require('../Virtual');

const connect = require('./commands/connect');
const disconnect = require('./commands/disconnect');
const pause = require('./commands/pause');
const resume = require('./commands/resume');
const cancel = require('./commands/cancel');
const jog = require('./commands/jog');
const updateRoutine = require('./commands/updateRoutine');
const processGcode = require('./commands/processGcode');
const initialize = require('./commands/initialize');
const startJob = require('./commands/startJob');

const info = {
  connectionType: 'remote',
  fileTypes: ['.gcode'],
};

const settings = {
  name: 'Remote Bot',
  model: __dirname.split('/')[__dirname.split('/').length - 1],
};

const commands = {
  connect,
  disconnect,
  pause,
  resume,
  cancel,
  jog,
  initialize,
  processGcode,
  updateRoutine,
  startJob,
};

module.exports = {
  info: _.extend(Object.assign({}, VirtualBot.info), info),
  settings: _.extend(Object.assign({}, VirtualBot.settings), settings),
  commands: _.extend(Object.assign({}, VirtualBot.commands), commands),
};
