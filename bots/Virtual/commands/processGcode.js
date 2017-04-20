const gcodeToObject = require('gcode-json-converter').gcodeToObject;
const objectToGcode = require('gcode-json-converter').objectToGcode;

module.exports = async function processGcode(self, params) {
  try {
    if (
      self.fsm.current !== 'paused'
      && self.fsm.current !== 'idle'
    ) {
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
        postCallback: (command, reply) => {
          resolve(reply);
        },
      });
      self.queue.queueCommands(commandArray);
    })
    .catch((ex) => {
      self.logger.error('Awaiting error', ex);
    });
  } catch (ex) {
    self.logger.error(ex);
  }
};
