module.exports = function generateParkCommands(self) {
  const parkLift = 10;
  const yPark = -50;
  const currentPosition = {
    x: undefined,
    y: undefined,
    z: undefined,
    e: undefined,
  };

  const commandArray = [];
  commandArray.push('M400');
  commandArray.push({
    preCallback: () => {
      self.logger.debug('Starting park movements');
    },
    code: 'M114',
    processData: (command, reply) => {
      const m114Regex = /.*X:([+-]?\d+(\.\d+)?)\s*Y:([+-]?\d+(\.\d+)?)\s*Z:([+-]?\d+(\.\d+)?)\s*E:([+-]?\d+(\.\d+)?).*/;
      const parsedPosition = reply.match(m114Regex);
      currentPosition.x = Number(parsedPosition[1]);
      currentPosition.y = Number(parsedPosition[3]);
      currentPosition.z = Number(parsedPosition[5]);
      currentPosition.e = Number(parsedPosition[7]);
      self.pausedPosition = Object.assign({}, currentPosition);
      return true;
    }
  });
  commandArray.push('G92 E0'); // Reset extrusion
  commandArray.push('G1 E-2 F3000'); // Retract
  if (self.pausedPosition.z < 500 - parkLift) {
    commandArray.push(`G1 Z${(self.pausedPosition + parkLift).toFixed(2)} F1000`);
  }
  if (self.pausedPosition.y > Number(self.settings.offsetY)) {
    commandArray.push('G1 Y' + Number(self.settings.offsetY).toFixed(2) + ' F10000'); // Scrub
  }
  commandArray.push('G1 Y' + Number(yPark + self.settings.offsetY).toFixed(2) + ' F2000'); // Drag Y across the purge
  commandArray.push({
    code: 'M400', // Clear motion buffer before saying we're done
    postCallback: () => {
      self.parked = true;
      self.logger.debug('Done with park movements');
    }
  });
  return commandArray;
};
