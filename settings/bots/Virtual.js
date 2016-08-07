const _ = require(`underscore`);

const DefaultBot = require(`./DefaultBot`);

const Virtual = function (app) {
  DefaultBot.call(this, app);

  _.extend(this.settings, {
    name: `Virtual Bot`,
    model: `Virtual`,
  });

  _.extend(this.info, {
    connectionType: `virtual`,
  });
};

module.exports = Virtual;
