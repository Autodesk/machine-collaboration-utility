/* global logger */
module.exports = function generateParkCommands(self) {
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
      // Consider adding a specific G1 X<value> command instead of homing

      // In this example, bot1 parks at X10, and bot2 parks at X490
      // const xParkPosition = Number(self.settings.name[3]) === 1 ? 10 : 490;
      // parkCommandArray.push([
      //   `G1 X${xParkPosition}`,
      //   {
      //     code: self.info.clearBufferCommand, // Clear motion buffer before saying we're done
      //     postCallback: () => {
      //       self.parked = true;
      //       logger.debug('Done with park movements');
      //     },
      //   },
      // ]);

      parkCommandArray.push({
        code: 'G28 X Y', // Clear motion buffer before saying we're done
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
