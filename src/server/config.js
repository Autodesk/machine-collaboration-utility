module.exports = {
  apiVersion: `v1`,
  logFileName: `hydra-print.log`,
  testLogFileName: `hydra-print-test.log`,
  virtualDelay: 1000,
  conductor: {
    botModel: `Escher2HydraPrint`,
    // botModel: `Virtual`,
    n_players: [5, 1],
  },
};
