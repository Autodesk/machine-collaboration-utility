const SmoothieBoardTelnet = require(`./SmoothieBoardTelnet`);

module.exports = class SmoothieBoard extends SmoothieBoardTelnet {
  constructor(app) {
    super(app);
    this.settings.name = `Smoothie Board`;
    this.settings.model = `SmoothieBoard`;
    this.connectionType = `serial`;
    this.vid = 7504;
    this.pid = 24597;
    this.baudrate = 230400;
  }
};
