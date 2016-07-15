const Escher2Conductor = require(`./Escher2Conductor`);
const DefaultBot = require(`./DefaultBot`);

module.exports = class Escher2 extends Escher2Conductor {
  constructor(app) {
    super(app);
    this.settings.name = `Escher 2`;
    this.settings.model = `Escher2`;
    this.connectionType = `serial`;
    this.vid = 9025;
    this.pid = 66;
    this.baudrate = 230400;
    this.commands.processGcode = DefaultBot.commands.processGcode;
    this.commands.streamGcode = DefaultBot.commands.streamGcode;
  }
};
