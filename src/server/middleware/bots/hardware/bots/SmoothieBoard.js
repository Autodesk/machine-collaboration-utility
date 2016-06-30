const SmoothieBoardConductor = require(`./SmoothieBoardConductor`);

module.exports = class SmoothieBoard extends SmoothieBoardConductor {
  constructor(app) {
    super(app);
    this.connectionType = `serial`;
    this.vid = 7504;
    this.pid = 24597;
    this.baudrate = 230400;
  }
};
