const HydraPrint = require(`./HydraPrint`);

module.exports = class SmoothieBoardHydraPrint extends HydraPrint {
  constructor(app) {
    super(app);
    this.settings.name = `Escher 2 HydraPrint`;
    this.settings.model = `Escher2HydraPrint`;
  }
};
