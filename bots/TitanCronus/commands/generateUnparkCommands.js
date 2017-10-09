// Returns an array of purge commands
module.exports = function generateUnparkCommands(self) {
  const commandArray = [];
  const purgeAmount = 10;
  const scrubEnd = Number(self.settings.offsetY).toFixed(2);

  commandArray.push(self.info.clearBufferCommand);
  commandArray.push('G92 E0');
  commandArray.push(`G1 E${purgeAmount} F100`); // Purge
  commandArray.push(`G1 E${purgeAmount - 2} F3000`); // Retract
  commandArray.push(`G1 Y${scrubEnd} F2000`); // Scrub
  commandArray.push('G92 E-2'); // Prepare extruder for E0
  commandArray.push(self.info.clearBufferCommand); // Clear motion buffer before saying we're done
  commandArray.push({
    postCallback: () => {
      self.parked = false;
    },
  });

  const purgeCheck = {
    postCallback: () => {
      if (self.parked) {
        self.queue.queueSequentialCommands(commandArray);
      }
    },
  };
  return purgeCheck;
};
