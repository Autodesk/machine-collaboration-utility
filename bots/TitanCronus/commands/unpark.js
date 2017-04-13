const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function unpark(self, params) {
  try {
    if (!(self.fsm.current === 'parked' || self.fsm.current === 'parking')) {
      throw new Error(`Cannot unpark from state "${self.fsm.current}"`);
    }

    const purgeAmount = 10;

    const unparkDoneCommand = {
      postCallback: () => {
        self.fsm.unparkDone();
        self.lr.resume();
      },
    };

    const unparkMotionArray = [];
    unparkMotionArray.push({
      preCallback: () => {
        self.logger.debug('Starting unpark motion', params);
      },
    });

    if (params.dry === false) {
      unparkMotionArray.push('G92 E0');
      unparkMotionArray.push(`G1 E${purgeAmount} F100`); // Purge
      unparkMotionArray.push(`G1 E${purgeAmount - 2} F3000`); // Retract
      unparkMotionArray.push('G1 Y' + (0 + Number(self.settings.offsetY)).toFixed(2) + ' F2000'); // Scrub
      unparkMotionArray.push('G92 E-2'); // Prepare extruder for E0
      unparkMotionArray.push('M400'); // Clear motion buffer before saying we're done
    }
    unparkMotionArray.push({
      preCallback: () => {
        self.queue.prependCommands(unparkDoneCommand);
        self.logger.debug('Done with unpark motion');
      }
    });

    const commandArray = [];
    if (self.fsm.current === 'parking') {
      commandArray.push({
        postCallback: () => {
          self.fsm.unpark();
        }
      });
    }

    commandArray.push(...unparkMotionArray);
    self.queue.queueCommands(commandArray);

    // Queue the unpark command if currently 'parking'
    if (self.fsm.current === 'parked') {
      // Unpark the bot
      self.fsm.unpark();
    }

  } catch (ex) {
    self.logger.error('Unpark error', ex);
  }
  return self.getBot();
};
