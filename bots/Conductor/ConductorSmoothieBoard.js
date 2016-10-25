const _ = require('underscore');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');

const Conductor = require('./Conductor');

const ConductorSmoothieBoard = function (app) {
  Conductor.call(this, app);

  _.extend(this.settings, {
    name: 'Conductor SmoothieBoard',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    conductorPresets: {
      botModel: 'HardwareHub',
    },
  });
};

module.exports = ConductorSmoothieBoard;
