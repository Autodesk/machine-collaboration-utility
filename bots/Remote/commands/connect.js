/* global logger */

const request = require('request-promise');
const { delay } = require('bluebird');

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
    }).catch(async (ex) => {
      // If connect command fails, set bot back to idle
      // Wait 500ms before sending to prevent confusion from near-instanteous UI change
      await delay(500);
      self.fsm.current = 'ready';
      self.app.io.broadcast('botEvent', {
        uuid: self.settings.uuid,
        event: 'update',
        data: self.getBot(),
      });
    });
  } catch (ex) {
    logger.error('Connect fail', ex);
  }
};
