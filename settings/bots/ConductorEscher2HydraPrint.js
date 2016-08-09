const _ = require(`underscore`);

const ConductorVirtual = require(`./ConductorVirtual`);

const ConductorEscher2HydraPrint = function (app) {
  ConductorVirtual.call(this, app);

  _.extend(this.settings, {
    name: `Conductor Escher2`,
    model: `ConductorEscher2HydraPrint`,
  });

  _.extend(this.info, {
    conductorPresets: {
      botModel: `Escher2HydraPrint`,
      nPlayers: [5, 1],
    },
    players: {},
  });
};

module.exports = ConductorEscher2HydraPrint;
