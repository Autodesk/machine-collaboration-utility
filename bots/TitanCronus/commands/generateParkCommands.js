/* global logger */
module.exports = function generateParkCommands(self) {
  const parkLift = 10;
  const currentPosition = {
    x: undefined,
    y: undefined,
    z: undefined,
    e: undefined,
  };

  const commandArray = [];
  commandArray.push(self.info.clearBufferCommand);
  commandArray.push({
    preCallback: () => {
      logger.debug('Starting park movements');
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
      const parkCommandArray = ['G92 E0', 'G1 E-2 F3000'];
      parkCommandArray.push(`G1 Z${(self.parkedPosition.z + parkLift).toFixed(2)} F1000`);
      parkCommandArray.push({
        code: self.info.clearBufferCommand, // Clear motion buffer before saying we're done
        postCallback: () => {
          self.parked = true;
          logger.debug('Done with park movements');
        },
      });
      self.queue.queueSequentialCommands(parkCommandArray);
    },
  });

  return commandArray;
};
