const _ = require('underscore');

const Marlin = require('./Marlin');

const Prusa = function Prusa(app) {
  Marlin.call(this, app);

  _.extend(this.settings, {
    name: 'Prusa',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    vid: 0x2c99,
    pid: 0x0001,
    baudrate: 115200,
  });
};

module.exports = Prusa;
