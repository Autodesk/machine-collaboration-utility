/* global logger */
const request = require('request');

module.exports = async function connect(self) {
  try {
    self.fsm.current = 'cancelingJob';
    self.app.io.broadcast('botEvent', {
      uuid: self.settings.uuid,
      event: 'update',
      data: self.getBot(),
    });
    await request(self.settings.endpoint, {
      method: 'POST',
      json: true,
      body: { command: 'cancel' },
    });
  } catch (ex) {
    logger.error('Connect fail', ex);
  }
};
