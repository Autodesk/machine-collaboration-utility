const Escher2Conductor = require(`./Escher2Conductor`);

module.exports = class Escher2 extends Escher2Conductor {
  constructor(app) {
    super(app);
    this.settings.name = `Escher 2`;
    this.connectionType = `serial`;
    this.vid = 9025;
    this.pid = 66;
    this.baudrate = 230400;
  }
};
