const Marlin = require(`./Marlin`);

module.exports = class Printrbot extends Marlin {
  constructor(app) {
    super(app);
    this.settings.name = `Printrbot Serial`;
    this.settings.model = `Printrbot`;
    this.vid = 5824;
    this.pid = 1155;
    this.baudrate = 230400;
  }
};
