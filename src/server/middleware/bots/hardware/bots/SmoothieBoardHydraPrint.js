const HydraPrint = require(`./HydraPrint`);
const request = require(`request-promise`);

module.exports = class SmoothieBoardHydraPrint extends HydraPrint {
  constructor(app) {
    super(app);
    this.settings.name = `Smoothie Board HydraPrint`;
    this.settings.model = `SmoothieBoardHydraPrint`;

    this.commands.updateRoutine = async (self, params) => {
      const requestParams = {
        method: `GET`,
        uri: self.port,
        json: true,
      };
      const reply = await request(requestParams);
      self.status.position.x = reply.data.status.position.x;
      self.status.position.y = reply.data.status.position.y;
      self.status.position.z = reply.data.status.position.z;
      self.status.position.e = reply.data.status.position.e;
      self.status.sensors.t0 = reply.data.status.sensors.t0;
      self.app.io.emit(`updateBots`, self.app.context.bots.getBots());
    };
  }
};
