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
      self.parkedPosition = Object.assign({}, currentPosition);
      return true;
    },
    postCallback: () => {
      const offsetY = Number(Number(self.settings.offsetY).toFixed(2));
      const parkCommandArray = ['G92 E0', 'G1 E-2 F3000'];
      if (self.parkedPosition.z < 500 - parkLift) {
        parkCommandArray.push(`G1 Z${(self.parkedPosition.z + parkLift).toFixed(2)} F1000`);
      }
      if (self.parkedPosition.y > offsetY) {
        parkCommandArray.push(`G1 Y${offsetY} F10000`); // Scrub
      }
      const scrubEnd = Number(yPark + offsetY).toFixed(2);
      parkCommandArray.push(`G1 Y${scrubEnd} F2000`); // Drag Y across the purge
      parkCommandArray.push({
        code: 'M400', // Clear motion buffer before saying we're done
        postCallback: () => {
          self.parked = true;
          self.logger.debug('Done with park movements');
        },
      });
      self.queue.prependCommands(parkCommandArray);
    },
  });

  return commandArray;
};
