const DefaultBot = require('./DefaultBot');

module.exports = class Printrbot extends DefaultBot {
  constructor(app) {
    super(app);
    this.connectionType = 'serial';

    this.settings.name = `Printrbot`;
    this.settings.model = `Printrbot`;

    this.vid = 5824;
    this.pid = 1155;
    this.baudrate = 230400;
  }
};
