module.exports = class DefaultBot {
  constructor(app) {
    this.app = app;
    this.logger = app.context.logger;
    this.connectionType = undefined;

    this.settings = {
      name: `Default`,
      model: `DefaultBot`,
      botId: `default`,
      jogXSpeed: `1000`,
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
  }
};
