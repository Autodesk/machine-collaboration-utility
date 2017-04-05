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

    const commandArray = ['M400'];
    commandArray.push({
      processData: async () => {
        self.fsm.park();
        console.log('parking', self.settings.name);
        await delay(1000);
        self.fsm.parkDone();
        return true;
      },
    });
    self.queue.queueCommands(commandArray);
    console.log('just queued park, 1 second, park done');
  } catch (ex) {
    self.fsm.parkFail();
  }
  return self.getBot();
};
