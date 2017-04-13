const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

// Returns an array of purge commands
function purgeCommands() {
  const commandArray = [];
  const purgeAmount = 10;
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

module.exports = async function unblock(self, params) {
  try {
    if (self.fsm.current === 'executingJob') {
      const commandArray = [
        ...purgeCommands(),
        {
          postCallback: () => {
            self.lr.resume();
          }
        }
      ]
      self.queue.queueCommands(commandArray);
    } else {
      if (!(self.fsm.current === 'blocked' || self.fsm.current === 'blocking')) {
        throw new Error(`Cannot unblock from state "${self.fsm.current}"`);
      }

      const commandArray = [];
      if (self.fsm.current === 'blocking') {
        commandArray.push({
          postCallback: () => {
            self.fsm.unblock();
          }
        });
      }
      commandArray.push({
        preCallback: () => {
          self.logger.debug('Starting unblock motion', params);
        },
      });

      if (params.dry === false) {
        commandArray.push(purgeCommands());
      }

      const unblockDoneCommand = {
        postCallback: () => {
          self.fsm.unblockDone();
          self.lr.resume();
        },
      };
      commandArray.push({
        preCallback: () => {
          self.queue.prependCommands(unblockDoneCommand);
          self.logger.debug('Done with unblock motion');
        }
      });

      self.queue.queueCommands(commandArray);

      // Queue the unblock command if currently 'blocking'
      if (self.fsm.current === 'blocked') {
        // Unblock the bot
        self.fsm.unblock();
      }
    }
  } catch (ex) {
    self.logger.error('Unblock error', ex);
  }
  return self.getBot();
};
