module.exports = {
  logFileName: `hydra-print.log`,
  testLogFileName: `hydra-print-test.log`,
  virtualDelay: 1000,
  bot: {
    vid: 10612,
    pid: 1283,
    baudrate: 230400,
  },
  conductor: {
    players: [
      {
        name: `alf`,
        url: `http://escher1a.local:9000`,
      },
      {
        name: `bettie`,
        url: `http://escher1a.local:9000`,
      },
      {
        name: `cletus`,
        url: `http://escher1a.local:9000`,
      },
      {
        name: `daphnie`,
        url: `http://escher1a.local:9000`,
      },
      {
        name: `earl`,
        url: `http://escher1a.local:9000`,
      },
    ],
  },
};
