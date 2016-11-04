const _ = require('underscore');

const Marlin = require('./Marlin');

const Boot = function Boot(app) {
  Marlin.call(this, app);

  _.extend(this.settings, {
    name: 'Boot',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    vid: 0x0403,
    pid: 0x6001,
    baudrate: 115200,
  });
};

module.exports = Boot;
