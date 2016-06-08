const DefaultBot = require(`./DefaultBot`);

module.exports = class Escher_2 extends DefaultBot {
  constructor(app) {
    super(app);
    this.settings.name = `Escher 2.0`;
    this.settings.model = `Escher2`;
    this.connectionType = `serial`;
    this.vid = 9025;
    this.pid = 66;
    this.baudrate = 230400;
  }
};
