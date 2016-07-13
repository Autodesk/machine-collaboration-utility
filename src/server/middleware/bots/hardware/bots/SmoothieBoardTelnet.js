const DefaultBot = require(`./DefaultBot`);

module.exports = class SmoothieBoard extends DefaultBot {
  constructor(app) {
    super(app);
    this.settings.name = `Smoothie Board Telnet`;
    this.settings.model = `SmoothieBoardTelnet`;
    this.connectionType = `telnet`;
  }
};
