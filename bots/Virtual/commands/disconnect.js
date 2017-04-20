const path = require('path');

const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));

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
        self.fsm.disconnectDone();
      },
    });
  } catch (ex) {
    self.fsm.disconnectFail();
  }
  return self.getBot();
};
