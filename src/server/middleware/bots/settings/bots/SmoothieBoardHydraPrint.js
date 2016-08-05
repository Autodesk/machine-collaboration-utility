const HydraPrint = require(`./HydraPrint`);
const request = require(`request-promise`);
const bsync = require(`asyncawait/async`);
const bwait = require(`asyncawait/await`);

module.exports = class SmoothieBoardHydraPrint extends HydraPrint {
  constructor(app) {
    super(app);
    this.settings.name = `Smoothie Board HydraPrint`;
    this.settings.model = `SmoothieBoardHydraPrint`;

    this.commands.updateRoutine = bsync((self, params) => {
      const requestParams = {
        method: `GET`,
        uri: self.port,
        json: true,
      };
      const reply = bwait(request(requestParams));
      self.status.position.x = reply.data.status.position.x;
      self.status.position.y = reply.data.status.position.y;
      self.status.position.z = reply.data.status.position.z;
      self.status.position.e = reply.data.status.position.e;
      self.status.sensors.t0 = reply.data.status.sensors.t0;
      self.app.io.emit(`botEvent`, {
        uuid: self.settings.uuid,
        event: `update`,
        data: self.getBot(),
      });
    });
  }
};
