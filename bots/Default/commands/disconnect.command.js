module.exports = function disconnect(self, params) {
  self.fsm.disconnect();
  try {
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
