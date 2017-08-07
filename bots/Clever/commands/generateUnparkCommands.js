// Returns an array of purge commands
module.exports = function generateUnparkCommands(self) {
  const commandArray = [];
  const purgeAmount = 10;
  const scrubEnd = Number(self.settings.offsetY).toFixed(2);

  commandArray.push(self.info.clearBufferCommand);
  commandArray.push({
    postCallback: () => { self.parked = false; },
  });

  const purgeCheck = [{
    postCallback: () => {
      if (self.parked) {
        self.queue.prependCommands(commandArray);
      }
    },
  }];
  return purgeCheck;
};
