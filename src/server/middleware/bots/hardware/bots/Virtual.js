const DefaultBot = require(`./DefaultBot`);

module.exports = class Virtual extends DefaultBot {
  constructor(app) {
    super(app);
    this.settings.name = `Virtual Bot`;
    this.settings.model = `Virtual`;
    this.connectionType = `virtual`;
  }
};
