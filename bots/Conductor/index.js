const _ = require('lodash');
const path = require('path');

const VirtualBot = require('../Virtual');

const initialize = require('./commands/initialize');
const connect = require('./commands/connect');
const disconnect = require('./commands/disconnect');
const startJob = require('./commands/startJob');
const pause = require('./commands/pause');
const resume = require('./commands/resume');
const cancel = require('./commands/cancel');
const updateRoutine = require('./commands/updateRoutine');
const updateCollaborativeBotCheckpoint = require('./commands/updateCollaborativeBotCheckpoint');
const updatePlayers = require('./commands/updatePlayers');
const addPlayer = require('./commands/addPlayer');
const removePlayer = require('./commands/removePlayer');

const info = {
  connectionType: 'conductor',
  fileTypes: ['.esh'],
};

const settings = {
  model: __dirname.split('/')[__dirname.split('/').length - 1],
  name: 'Conductor',
  custom: {
    players: [],
  },
};

const commands = {
  initialize,
  connect,
  disconnect,
  startJob,
  pause,
  resume,
  cancel,
  updateRoutine,
  updateCollaborativeBotCheckpoint,
  updatePlayers,
  addPlayer,
  removePlayer,
};

module.exports = {
  info: _.extend(Object.assign({}, VirtualBot.info), info),
  settings: _.extend(Object.assign({}, VirtualBot.settings), settings),
  commands: _.extend(Object.assign({}, VirtualBot.commands), commands),
};
