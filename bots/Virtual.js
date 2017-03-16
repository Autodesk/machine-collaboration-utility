const _ = require('underscore');

const DefaultBot = require('./DefaultBot');

const Virtual = function (app) {
  DefaultBot.call(this, app);

  _.extend(this.settings, {
    name: 'Virtual Bot',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    connectionType: 'virtual',
    fileTypes: ['.gcode'],
  });
};

module.exports = Virtual;
