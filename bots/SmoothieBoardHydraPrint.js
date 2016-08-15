const HydraPrint = require(`./HydraPrint`);
const _ = require(`underscore`);

const SmoothieBoardHydraPrint = function SmoothieBoardHydraPrint(app){
  HydraPrint.call(this, app);

  _.extend(this.settings, {
    name: `Smoothie Board HydraPrint`,
    model: `SmoothieBoardHydraPrint`,
  });
};

module.exports = SmoothieBoardHydraPrint;
