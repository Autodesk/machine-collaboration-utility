/* global logger */
const delay = Promise.delay;

module.exports = function connect(self) {
  try {
    if (self.fsm.current !== 'ready') {
      throw new Error(`Cannot connect from state "${self.fsm.current}"`);
    }
    self.fsm.connect();

    self.queue.queueCommands({
      open: true,
      postCallback: async () => {
        await delay(100); // Fake connecting delay
        self.commands.toggleUpdater(self, { update: true });
        self.fsm.connectDone();
      },
    });
  } catch (ex) {
    logger.error('Connect fail.', ex);
    self.fsm.connectFail();
  }
  return self.getBot();
};
