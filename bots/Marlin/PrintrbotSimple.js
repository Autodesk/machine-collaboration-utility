const _ = require('lodash');

const Marlin = require('./Marlin');

const Printrbot = function (app) {
  Marlin.call(this, app);

  _.extend(this.settings, {
    name: 'Printrbot Simple Serial',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    vidPid: [
      {
        vid: 0x16C0,
        pid: 0x0483,
      },
      {
        vid: 0x2974,
        pid: 0x0620,
      },
    ],
    baudrate: 230400,
  });
};

module.exports = Printrbot;
