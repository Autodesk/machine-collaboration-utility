const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function park(self, params) {
  try {
    if (self.fsm.current !== 'executingJob') {
      throw new Error(`Cannot park from state "${self.fsm.current}"`);
    }
    // We want park to happen in a very specific order
    // 1. Start park from the state machine immediately
    // 2. Allow for park movements / macros / etc
    // 3. Complete state machine park transition by signaling that park is complete
    //
    // In order to accomplish this, we must prepend the current commands in the queue
    // We call the state machine command "park"
    // In the postCallback of 1, we prepend 2 to the queue
    // Then in the postCallback of 2, we prepend 3 to the queue
    //
    // This comes across a bit backwards, but the ordering is necessary in order to prevent
    // transitioning to an incorrect state

    const parkEndCommand = {
      postCallback: () => {
        self.fsm.parkDone();
      },
    };

    const parkLift = 10;
    const yPark = -50;
    const currentPosition = {
      x: undefined,
      y: undefined,
      z: undefined,
      e: undefined,
    };

    const commandArray = [];
    commandArray.push({
      preCallback: () => {
        self.logger.debug('Starting park movements');
      },
      code: 'M114',
      processData: (command, reply) => {
        const m114Regex = /.*X:([+-]?\d+(\.\d+)?)\s*Y:([+-]?\d+(\.\d+)?)\s*Z:([+-]?\d+(\.\d+)?)\s*E:([+-]?\d+(\.\d+)?).*/;
        const parsedPosition = data.match(m114Regex);
        currentPosition.x = parsedPosition[1];
        currentPosition.y = parsedPosition[3];
        currentPosition.z = parsedPosition[5];
        currentPosition.e = parsedPosition[7];
        return true;
      }
    });
    commandArray.push('G92 E0'); // Reset extrusion
    commandArray.push('G1 E-2 F3000'); // Retract
    if (currentPosition.z < 500) {
      commandArray.push(`G1 Z${(currentPosition.z + parkLift).toFixed(2)} F1000`);
    }
    if (Number(currentPosition.y - self.settings.offsetY) > 0) {
      commandArray.push('G1 Y' + (0 + Number(self.settings.offsetY) ).toFixed(2) + ' F10000'); // Scrub
    }
    commandArray.push('G1 Y' + (yPark + Number(self.settings.offsetY) ).toFixed(2) + ' F2000'); // Drag Y across the purge
    commandArray.push({
      code: 'M400', // Clear motion buffer before saying we're done
      postCallback: () => {
        self.logger.debug('Done with park movements');
        self.queue.prependCommands(parkEndCommand);
      }
    });

    self.queue.prependCommands(commandArray);

    self.logger.debug('Just queued park', self.getBot().settings.name, self.fsm.current);
    self.fsm.park();
  } catch (ex) {
    self.logger.error('Park error', ex);
  }

  return self.getBot();
};
