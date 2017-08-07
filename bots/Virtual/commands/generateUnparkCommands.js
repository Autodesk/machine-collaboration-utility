// Returns an array of purge commands
module.exports = function generateUnparkCommands(self) {
  const commandArray = [];

  commandArray.push(self.info.clearBufferCommand);
  commandArray.push({
    postCallback: () => { self.parked = false; },
  });

  const parkCheck = [{
    postCallback: () => {
      if (self.parked) {
        self.queue.prependSequentialCommands(commandArray);
      }
    },
  }];

  return parkCheck;
};
