const delay = require('bluebird').delay;

module.exports = function park(self, params) {
  try {
    // idempotent
    if (self.fsm.current === 'parked' || self.fsm.current === 'parking') {
      return self.getBot();
    }

    if (self.fsm.current !== 'executingJob') {
      throw new Error(`Cannot park from state "${self.fsm.current}"`);
    }

    self.fsm.park();

    const commandArray = ['M400'];
    commandArray.push({
      postCallback: async () => {
        console.log('parking', self.settings.name);
        await delay(1000);
        self.fsm.parkDone();
      },
    });
    console.log('queueing park command');
    self.queue.queueCommands(commandArray);
  } catch (ex) {
    self.fsm.parkFail();
  }
  return self.getBot();
};
