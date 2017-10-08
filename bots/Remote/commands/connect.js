/* global logger */

const request = require('request');

module.exports = async function connect(self) {
  try {
    self.fsm.current = 'connecting';
    self.app.io.broadcast('botEvent', {
      uuid: self.settings.uuid,
      event: 'update',
      data: self.getBot(),
    });
    await request(self.settings.endpoint, {
      method: 'POST',
      json: true,
      body: { command: 'connect' },
    });
  } catch (ex) {
    logger.error('Connect fail', ex);
  }
};
