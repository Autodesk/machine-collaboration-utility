module.exports = {
  apiVersion: `v1`,
  logFileName: `hydra-print.log`,
  testLogFileName: `hydra-print-test.log`,
  virtualDelay: 1000,
  baudrate: 230400,
  vidPids: [
    {
      vid: 10612,
      pid: 1283,
    },
    {
      vid: 5824,
      pid: 1155,
    },
    {
      vid: 9025,
      pid: 66,
    },
  ],
  conductor: {
    players: [
      {
        name: `alf`,
        url: `http://escher1a.local:9000`,
      },
    ],
  },
};
