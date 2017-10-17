/* global logger */
const checksumReset = require('../../Virtual/helpers/checksumReset');

module.exports = function connect(self) {
  try {
    if (self.fsm.current !== 'ready') {
      throw new Error(`Cannot connect from state "${self.fsm.current}"`);
    }
    self.fsm.connect();

    self.queue.queueCommands({
      open: true,
      postCallback: async () => {
        self.commands.toggleUpdater(self, { update: true });
        self.fsm.connectDone();

        if (self.info.checksumSupport) {
          const checksumResetCommand = checksumReset(self);
          self.queue.prependCommands(checksumResetCommand);
        }
      },
    });
  } catch (ex) {
    logger.error('Connect fail.', ex);
    // Not sure where to put connect fail
    // self.fsm.connectFail();
  }

  return self.getBot();
};
