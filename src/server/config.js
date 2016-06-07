module.exports = {
  apiVersion: `v1`,
  logFileName: `hydra-print.log`,
  testLogFileName: `hydra-print-test.log`,
  virtualDelay: 1000,
  conductor: {
    enabled: false,
    comType: 'http',
    players: [
      'a',
      'b',
      'c',
      'd',
      'e',
    ],
  },
};
