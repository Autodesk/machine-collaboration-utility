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
        name: `Alf`,
        url: `http://escher2a.local:9997`,
      },
      {
        name: `Bettie`,
        url: `http://escher2a.local:9997`,
      },
      {
        name: `Cletus`,
        url: `http://escher2a.local:9997`,
      },
      {
        name: `Daphnie`,
        url: `http://escher2a.local:9997`,
      },
      {
        name: `Earl`,
        url: `http://escher2a.local:9997`,
      },
    ],
  },
};
