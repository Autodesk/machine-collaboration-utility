const delay = require('bluebird').delay;

module.exports = function unpark(self, params) {
  if (self.fsm.current !== 'parked') {
    throw new Error(`Cannot unpark from state "${self.fsm.current}"`);
  }
  self.fsm.unpark();
  try {
    const commandArray = [];
    commandArray.push({
      postCallback: async() => {
        await delay(1000);
        await self.fsm.unparkDone();
      },
    });
    self.queue.queueCommands(commandArray);
  } catch (ex) {
    self.fsm.unparkFail();
  }
  return self.getBot();
};
