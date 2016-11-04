const _ = require('underscore');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');

const Conductor = require('./Conductor');

const ConductorBoot = function (app) {
  Conductor.call(this, app);

  _.extend(this.settings, {
    name: 'Conductor Boot',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    conductorPresets: {
      botModel: 'HardwareHub',
    },
  });
};

module.exports = ConductorBoot;
