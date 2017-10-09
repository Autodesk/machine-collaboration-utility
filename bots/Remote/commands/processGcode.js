/* global logger */
const request = require('request');

// Param inputs
// @gcode: <string> A string of gcode to be executed
// @force: <boolean> Force gcode execution even if the bot is processing a job
module.exports = async function processGcode(self, params) {
  try {
    await request(self.settings.endpoint, { method: 'POST', json: true, body: params });
  } catch (ex) {
    logger.error(ex);
  }
};
