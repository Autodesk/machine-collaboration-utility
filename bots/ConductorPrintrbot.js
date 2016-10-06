const _ = require('underscore');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');

const Conductor = require('./Conductor');

const ConductorPrintrbot = function (app) {
  Conductor.call(this, app);

  _.extend(this.settings, {
    name: 'Conductor Printrbot',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    conductorPresets: {
      botModel: 'HydraPrint',
    },
  });

  _.extend(this.commands, {
    jog: bsync((self, params) => {
      switch (params.axis) {
        case 'x':
          console.log('jog x');
          break;
        case 'y':
          console.log('jog y');
          break;
        case 'z':
          console.log('jog z');
          break;
        case 'e':
          console.log('jog e');
          break;
        default:
          break;
      }
      return self.getBot();
    }),
  });
};

module.exports = ConductorPrintrbot;
