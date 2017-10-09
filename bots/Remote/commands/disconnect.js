/* global logger */
const request = require('request');

module.exports = async function disconnect(self) {
  try {
    self.fsm.current = 'disconnecting';
    self.app.io.broadcast('botEvent', {
      uuid: self.settings.uuid,
      event: 'update',
      data: self.getBot(),
    });
    await request(self.settings.endpoint, {
      method: 'POST',
      json: true,
      body: { command: 'disconnect' },
    });
  } catch (ex) {
    logger.error('Disconnect fail', ex);
  }
};
