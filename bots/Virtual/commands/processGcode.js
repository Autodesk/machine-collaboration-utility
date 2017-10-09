/* global logger */
const gcodeToObject = require('gcode-json-converter').gcodeToObject;
const objectToGcode = require('gcode-json-converter').objectToGcode;

// Param inputs
// @gcode: <string> A string of gcode to be executed
// @force: <boolean> Force gcode execution even if the bot is processing a job
module.exports = async function processGcode(self, params) {
  try {
    const force = String(params.force) === 'true';
    if (self.fsm.current !== 'paused' && self.fsm.current !== 'idle' && !force) {
      throw new Error(`Cannot process gcode from state ${self.fsm.current}`);
    }

    if (params.gcode === undefined) {
      throw new Error('"gcode" is undefined');
    }

    const gcodeObject = gcodeToObject(params.gcode);
    self.addOffset(gcodeObject);

    const commandArray = [];

    return await new Promise((resolve) => {
      commandArray.push({
        code: objectToGcode(gcodeObject, { comment: false }),
        processData: (command, reply) => {
          resolve(reply);
          return true;
        },
      });
      self.queue.queueCommands(commandArray);
    }).catch((ex) => {
      logger.error('Awaiting error', ex);
    });
  } catch (ex) {
    logger.error(ex);
  }
};
