const path = require('path');

const botFsmDefinitions = require(path.join(process.env.PWD, 'server/middleware/bots/botFsmDefinitions'));

module.exports = function disconnect(self) {
  try {
    if (!botFsmDefinitions.metaStates.connected.includes(self.fsm.current)) {
      throw new Error(`Cannot disconnect from state "${self.fsm.current}"`);
    }

    self.fsm.disconnect();
    self.queue.queueCommands({
      close: true,
      postCallback: () => {
        self.commands.toggleUpdater(self, { update: false });
        if (self.currentJob) {
          self.currentJob.cancel();
          self.currentJob = undefined;
          setTimeout(() => {
            self.app.io.broadcast('botEvent', {
              uuid: self.settings.uuid,
              event: 'update',
              data: self.getBot(),
            });
          }, 1000);
        }
        self.fsm.disconnectDone();
      },
    });
  } catch (ex) {
    self.fsm.disconnectFail();
  }
  return self.getBot();
};
