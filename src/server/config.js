module.exports = {
  apiVersion: `v1`,
  logFileName: `hydra-print.log`,
  testLogFileName: `hydra-print-test.log`,
  virtualDelay: 1000,
  conductor: {
    enabled: true,
    // botModel: `Escher2`,
    botModel: `Virtual`,
    n_players: [5, 1],
  },
};
