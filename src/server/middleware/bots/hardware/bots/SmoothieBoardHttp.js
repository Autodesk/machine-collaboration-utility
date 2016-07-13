const SmoothieBoardTelnet = require(`./SmoothieBoardTelnet`);

module.exports = class SmoothieBoardHttp extends SmoothieBoardTelnet {
  constructor(app) {
    super(app);
    this.settings.name = `Smoothie Board Http`;
    this.settings.model = `SmoothieBoardHttp`;
    this.connectionType = `http`;
  }
};
