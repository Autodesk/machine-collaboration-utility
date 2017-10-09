/* global logger */
const request = require('request');

module.exports = async function pause(self) {
  try {
    self.fsm.current = 'pausing';
    self.app.io.broadcast('botEvent', {
      uuid: self.settings.uuid,
      event: 'update',
      data: self.getBot(),
    });
    await request(self.settings.endpoint, {
      method: 'POST',
      json: true,
      body: { command: 'pause' },
    });
  } catch (ex) {
    logger.error('Pause fail', ex);
  }
};
