const delay = require('bluebird').delay;

module.exports = function park(self, params) {
  if (self.fsm.current !== 'executingJob') {
    throw new Error(`Cannot park from state "${self.fsm.current}"`);
  }

  self.fsm.park();
  try {
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
