const _ = require(`underscore`);

const Conductor = require(`./Conductor`);

const ConductorSmoothieBoard = function (app) {
  Conductor.call(this, app);

  _.extend(this.settings, {
    name: `Conductor Smoothie Board`,
    model: `ConductorSmoothieBoard`,
  });

  _.extend(this.info, {
    conductorPresets: {
      botModel: `SmoothieBoardHydraPrint`,
      nPlayers: [5, 1],
    },
    players: {},
  });
};

module.exports = ConductorSmoothieBoard;
