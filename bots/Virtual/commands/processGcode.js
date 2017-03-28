module.exports = async function processGcode(self, params) {
  const gcode = self.addOffset(params.gcode);
  if (gcode === undefined) {
    throw new Error('"gcode" is undefined');
  }
  const commandArray = [];

  return await new Promise((resolve, reject) => {
    commandArray.push({
      code: gcode,
      processData: (command, reply) => {
        resolve(reply.replace('\r', ''));
        return true;
      },
    });

    self.queue.queueCommands(commandArray);
  });
};
