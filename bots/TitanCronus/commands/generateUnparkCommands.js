// Returns an array of purge commands
module.exports = function generateUnparkCommands(self) {
  const commandArray = [];
  const purgeAmount = 10;
  commandArray.push('M400');
  commandArray.push('G92 E0');
  commandArray.push(`G1 E${purgeAmount} F100`); // Purge
  commandArray.push(`G1 E${purgeAmount - 2} F3000`); // Retract
  commandArray.push('G1 Y' + (0 + Number(self.settings.offsetY)).toFixed(2) + ' F2000'); // Scrub
  commandArray.push('G92 E-2'); // Prepare extruder for E0
  commandArray.push('M400'); // Clear motion buffer before saying we're done
  commandArray.push({
    postCallback: () => { self.parked = false }
  });

  const purgeCheck = {
    postCallback: () => {
      if (self.parked) {
        self.queue.prependCommands(commandArray);
      }
    }
  };
  return purgeCheck;
}
