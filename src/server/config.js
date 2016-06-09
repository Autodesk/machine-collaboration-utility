module.exports = {
  apiVersion: `v1`,
  logFileName: `hydra-print.log`,
  testLogFileName: `hydra-print-test.log`,
  virtualDelay: 1000,
  conductor: {
    enabled: true,
    botType: `Escher2`,
    players: [
      'a',
      'b',
      'c',
      'd',
      'e',
    ],
  },
};
