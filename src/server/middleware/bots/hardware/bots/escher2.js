const DefaultBot = require(`./DefaultBot`);

module.exports = class Escher2 extends DefaultBot {
  constructor(app) {
    super(app);
    this.name = `Escher2`;
    this.connectionType = `serial`;
    this.vid = 9025;
    this.pid = 66;
    this.baudrate = 230400;
  }
};
