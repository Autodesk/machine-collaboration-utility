const _ = require('underscore');

const Marlin = require('./Marlin');

const Escher2Serial = function Escher2Serial(app) {
  Marlin.call(this, app);

  _.extend(this.settings, {
    name: 'Escher 2 Serial',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    vid: 9025,
    pid: 66,
    baudrate: 230400,
  });
};

module.exports = Escher2Serial;
