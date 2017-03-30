const delay = require('bluebird').delay;

module.exports = function unpark(self, params) {
  try {
    if (!(self.fsm.current === 'parked' || self.fsm.current === 'parking')) {
      throw new Error(`Cannot unpark from state "${self.fsm.current}"`);
    }

    const commandArray = [];
    commandArray.push({
      postCallback: async() => {
        self.fsm.unpark();
        await delay(1000);
        self.fsm.unparkDone();
      },
    });
    self.queue.queueCommands(commandArray);
  } catch (ex) {
    self.logger.error('Park fail', ex);
  }
  return self.getBot();
};
