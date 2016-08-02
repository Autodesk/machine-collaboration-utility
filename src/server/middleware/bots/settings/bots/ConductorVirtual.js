const DefaultBot = require(`./DefaultBot`);

module.exports = class Conductor extends DefaultBot {
  constructor(app) {
    super(app);
    this.connectionType = `conductor`;

    this.settings = {
      model: `ConductorVirtual`,
      name: `Conductor Virtual`,
      endpoint: false,
      jogXSpeed: `2000`,
      jogYSpeed: `2000`,
      jogZSpeed: `1000`,
      jogESpeed: `120`,
      tempE: `200`,
      tempB: `0`,
      speedRatio: `1.0`,
      eRatio: `1.0`,
      offsetX: `0`,
      offsetY: `0`,
      offsetZ: `0`,
    };

    this.vid = undefined;
    this.pid = undefined;
    this.baudrate = undefined;

    this.fileTypes = ['.esh'];
  }
};
