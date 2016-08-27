const _ = require('underscore');

const Conductor = require('./Conductor');

const ConductorEscher2 = function (app) {
  Conductor.call(this, app);

  _.extend(this.settings, {
    name: `Conductor Escher2`,
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    conductorPresets: {
      botModel: `Escher2HydraPrint`,
      nPlayers: [5, 1],
    },
    players: {},
  });
};

module.exports = ConductorEscher2;
