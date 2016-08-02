const Marlin = require(`./Marlin`);

module.exports = class SmoothieBoard extends Marlin {
  constructor(app) {
    super(app);
    this.settings.name = `Smoothie Board Serial`;
    this.settings.model = `SmoothieBoardSerial`;
    this.vid = 7504;
    this.pid = 24597;
    this.baudrate = 230400;
  }
};
