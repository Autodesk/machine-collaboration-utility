/* global logger */
const request = require('request-promise');

// Param inputs
// @gcode: <string> A string of gcode to be executed
// @force: <boolean> Force gcode execution even if the bot is processing a job
module.exports = async function processGcode(self, params) {
  try {
    if (params.gcode) {
      self.app.io.broadcast(`botTx${self.settings.uuid}`, params.gcode);
    }

    const reply = await request(self.settings.endpoint, {
      method: 'POST',
      json: true,
      body: params,
    });

    if (reply.data) {
      self.app.io.broadcast(`botRx${self.settings.uuid}`, reply.data);
    }
  } catch (ex) {
    logger.error(ex);
  }
};
