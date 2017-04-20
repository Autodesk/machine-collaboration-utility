// Returns an array of purge commands
module.exports = function generateUnparkCommands(self) {
  const commandArray = [];

  commandArray.push('M400');
  commandArray.push({
    postCallback: () => { self.parked = false; },
  });

  const parkCheck = {
    postCallback: () => {
      if (self.parked) {
        self.queue.prependCommands(commandArray);
      }
    },
  };
  return parkCheck;
};
