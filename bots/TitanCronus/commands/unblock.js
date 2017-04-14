const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));
const generateUnparkCommands = require('./generateUnparkCommands');

module.exports = async function unblock(self, params) {
  try {
    if (self.fsm.current === 'executingJob') {
      const commandArray = [
        purgeCommands(self),
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
        commandArray.push(purgeCommands(self));
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
