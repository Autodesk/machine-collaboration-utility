/* global logger */
const request = require('request');

module.exports = async function resume(self) {
  try {
    self.fsm.current = 'resuming';
    self.app.io.broadcast('botEvent', {
      uuid: self.settings.uuid,
      event: 'update',
      data: self.getBot(),
    });
    await request(self.settings.endpoint, {
      method: 'POST',
      json: true,
      body: { command: 'resume' },
    });
  } catch (ex) {
    logger.error('resume fail', ex);
  }
};
