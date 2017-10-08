/* global logger */
const path = require('path');
const request = require('request-promise');

const botFsmDefinitions = require(path.join(
  process.env.PWD,
  'server/middleware/bots/botFsmDefinitions',
));

module.exports = async function updateRoutine(self, params) {
  const requestEndpoint = self.settings.endpoint;
  try {
    const reply = await request(requestEndpoint, { json: true });
    self.fsm.current = reply.data.state;
    self.status = reply.data.status;
    if (reply.data.currentJob) {
      self.currentJob = reply.data.currentJob;
    } else {
      self.currentJob = undefined;
    }
    self.app.io.broadcast('botEvent', {
      uuid: self.settings.uuid,
      event: 'update',
      data: self.getBot(),
    });
  } catch (ex) {
    console.log('Remote update error', ex);
  }
};
