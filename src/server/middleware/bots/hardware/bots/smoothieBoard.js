const DefaultBot = require(`./DefaultBot`);

module.exports = class SmoothieBoard extends DefaultBot {
  constructor(app) {
    super(app);
    this.settings.name = `SmoothieBoard`;
    this.settings.model = `smoothieboard`;
    this.connectionType = `serial`;
    this.vid = 7504;
    this.pid = 24597;
    this.baudrate = 230400;
  }
};
