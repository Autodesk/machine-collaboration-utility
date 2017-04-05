module.exports = function disconnect(self, params) {
  self.fsm.disconnect();
  try {
    self.queue.queueCommands({
      close: true,
      processData: () => {
        self.commands.toggleUpdater(self, { update: false });
        self.fsm.disconnectDone();
        return true;
      },
    });
  } catch (ex) {
    self.fsm.disconnectFail();
  }
  return self.getBot();
};
