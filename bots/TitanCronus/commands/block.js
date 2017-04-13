const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function block(self, params) {
  try {
    if (self.fsm.current === 'blocked') {
      return self.lr.resume();
    }

    if (self.fsm.current !== 'executingJob') {
      throw new Error(`Cannot block from state "${self.fsm.current}"`);
    }
    // We want block to happen in a very specific order
    // 1. Start block from the state machine immediately
    // 2. Allow for block movements / macros / etc
    // 3. Complete state machine block transition by signaling that block is complete
    //
    // In order to accomplish this, we must prepend the current commands in the queue
    // We call the state machine command "block"
    // In the postCallback of 1, we prepend 2 to the queue
    // Then in the postCallback of 2, we prepend 3 to the queue
    //
    // This comes across a bit backwards, but the ordering is necessary in order to prevent
    // transitioning to an incorrect state

    const blockEndCommand = {
      postCallback: () => {
        self.fsm.blockDone();
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
        self.logger.debug('Starting block movements');
      },
      code: 'M114',
      processData: (command, reply) => {
        const m114Regex = /.*X:([+-]?\d+(\.\d+)?)\s*Y:([+-]?\d+(\.\d+)?)\s*Z:([+-]?\d+(\.\d+)?)\s*E:([+-]?\d+(\.\d+)?).*/;
        const parsedPosition = reply.match(m114Regex);
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
        self.parked = true;
        self.logger.debug('Done with block movements');
        self.queue.prependCommands(blockEndCommand);
      }
    });

    self.queue.prependCommands(commandArray);

    self.logger.debug('Just queued block', self.getBot().settings.name, self.fsm.current);
    self.fsm.block();
  } catch (ex) {
    self.logger.error('block error', ex);
  }

  return self.getBot();
};
