const DefaultBot = require(`./DefaultBot`);

module.exports = class SmoothieBoard extends DefaultBot {
  constructor(app) {
    super(app);
    this.name = `SmoothieBoard`;
    this.connectionType = `serial`;
    this.vid = 7504;
    this.pid = 24597;
    this.baudrate = 230400;
    this.settings = {
      uniqueIdentifier: `default`,
      connectionType: undefined,
      name: `Default Bot`,
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
  }
};
