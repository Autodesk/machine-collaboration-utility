const Promise = require('bluebird');
const LineByLineReader = Promise.promisifyAll(require('line-by-line'));
const fs = require('fs');
const path = require('path');

const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

const discover = require('./commands/discover.command.js');
const connect = require('./commands/connect.command.js');
const disconnect = require('./commands/disconnect.command.js');
const startJob = require('./commands/startJob.command.js');
const pause = require('./commands/pause.command.js');
const resume = require('./commands/resume.command.js');
const cancel = require('./commands/cancel.command.js');
const park = require('./commands/park.command.js');
const unpark = require('./commands/unpark.command.js');
const toggleUpdater = require('./commands/toggleUpdater.command.js');
const updateRoutine = require('./commands/updateRoutine.command.js');
const jog = require('./commands/jog.command.js');
const processGcode = require('./commands/processGcode.command.js');
const addSubscriber = require('./commands/addSubscriber.command.js');
const updateCollaboratorCheckpoints = require('./commands/updateCollaboratorCheckpoints.command.js');
const unplug = require('./commands/unplug.command.js')

const info = {
  connectionType: 'virtual',
  fileTypes: ['.gcode'],
};

const settings = {
  model: __filename.split(`${__dirname}/`)[1].split('.bot.js')[0],
  name: 'Virtual Bot',
  endpoint: false,
  jogXSpeed: 2000,
  jogYSpeed: 2000,
  jogZSpeed: 1000,
  jogESpeed: 120,
  tempE: 200,
  tempB: 0,
  offsetX: 0.0,
  offsetY: 0.0,
  offsetZ: 0.0,
  openString: null,
};

const commands = {
  discover,
  connect,
  disconnect,
  startJob,
  pause,
  resume,
  cancel,
  park,
  unpark,
  toggleUpdater,
  updateRoutine,
  jog,
  processGcode,
  addSubscriber,
  updateCollaboratorCheckpoints,
  unplug,
};

module.exports = { settings, info, commands };
