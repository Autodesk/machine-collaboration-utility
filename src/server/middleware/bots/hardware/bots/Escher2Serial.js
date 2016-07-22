const Marlin = require(`./Marlin`);

module.exports = class SmoothieBoard extends Marlin {
  constructor(app) {
    super(app);
    this.settings.name = `Escher 2 Serial`;
    this.settings.model = `Escher2Serial`;
    this.vid = 9025;
    this.pid = 66;
    this.baudrate = 230400;
  }
};
