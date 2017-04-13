const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function unblock(self, params) {
  try {
    if (!(self.fsm.current === 'blocked' || self.fsm.current === 'blocking')) {
      throw new Error(`Cannot unblock from state "${self.fsm.current}"`);
    }

    const purgeAmount = 10;

    const unblockDoneCommand = {
      postCallback: () => {
        self.fsm.unblockDone();
        self.lr.resume();
      },
    };

    const unblockMotionArray = [];
    unblockMotionArray.push({
      preCallback: () => {
        self.logger.debug('Starting unblock motion', params);
      },
    });

    if (params.dry === false) {
      unblockMotionArray.push('G92 E0');
      unblockMotionArray.push(`G1 E${purgeAmount} F100`); // Purge
      unblockMotionArray.push(`G1 E${purgeAmount - 2} F3000`); // Retract
      unblockMotionArray.push('G1 Y' + (0 + Number(self.settings.offsetY)).toFixed(2) + ' F2000'); // Scrub
      unblockMotionArray.push('G92 E-2'); // Prepare extruder for E0
      unblockMotionArray.push('M400'); // Clear motion buffer before saying we're done
    }
    unblockMotionArray.push({
      preCallback: () => {
        self.queue.prependCommands(unblockDoneCommand);
        self.logger.debug('Done with unblock motion');
      }
    });

    const commandArray = [];
    if (self.fsm.current === 'blocking') {
      commandArray.push({
        postCallback: () => {
          self.fsm.unblock();
        }
      });
    }

    commandArray.push(...unblockMotionArray);
    self.queue.queueCommands(commandArray);

    // Queue the unblock command if currently 'blocking'
    if (self.fsm.current === 'blocked') {
      // Unblock the bot
      self.fsm.unblock();
    }

  } catch (ex) {
    self.logger.error('Unblock error', ex);
  }
  return self.getBot();
};
