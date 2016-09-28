const _ = require('underscore');

const Marlin = require('./Marlin');

const Printrbot = function (app) {
  Marlin.call(this, app);

  _.extend(this.settings, {
    name: 'Printrbot Simple Serial',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    vid: 5824,
    pid: 1155,
    baudrate: 230400,
  });
};

module.exports = Printrbot;
