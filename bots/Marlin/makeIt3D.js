const _ = require('underscore');

const Marlin = require('./Marlin');

const MakeIt3D = function (app) {
  Marlin.call(this, app);

  _.extend(this.settings, {
    name: 'MakeIt-3D',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    vidPid: [
      {
        vid: 0x0403,
        pid: 0x6015,
      },
    ],
    baudrate: 250000,
  });
};

module.exports = MakeIt3D;
