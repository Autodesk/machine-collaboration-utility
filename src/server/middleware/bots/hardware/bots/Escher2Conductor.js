const DefaultBot = require(`./DefaultBot`);

module.exports = class Escher2 extends DefaultBot {
  constructor(app) {
    super(app);
    this.settings.name = `Escher 2.0`;
    this.settings.model = `Escher2`;
    this.connectionType = `http`;
  }
};
