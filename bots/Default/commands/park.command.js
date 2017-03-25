module.exports = function park(self, params) {
  if (self.fsm.current !== 'executingJob') {
    throw new Error(`Cannot park from state "${self.fsm.current}"`);
  }
  self.fsm.park();
  try {
    const commandArray = [];
    commandArray.push({
      postCallback: async () => {
        await Promise.delay(1000);
        await self.fsm.parkDone();
      },
    });
    self.queue.queueCommands(commandArray);
  } catch (ex) {
    self.fsm.parkFail();
  }
  return self.getBot();
};
