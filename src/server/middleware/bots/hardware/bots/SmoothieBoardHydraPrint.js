const HydraPrint = require(`./HydraPrint`);

module.exports = class SmoothieBoardHydraPrint extends HydraPrint {
  constructor(app) {
    super(app);
    this.settings.name = `Smoothie Board HydraPrint`;
    this.settings.model = `SmoothieBoardHydraPrint`;
  }
};
