const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function unpark(self, params) {
  try {
    if (!(self.fsm.current === 'parked' || self.fsm.current === 'parking')) {
      throw new Error(`Cannot unpark from state "${self.fsm.current}"`);
    }

    const commandArray = [];

    const unparkDoneCommand = {
      postCallback: () => {
        self.fsm.unparkDone();
        self.lr.resume();
      },
    };

    const unparkMotion = {
      preCallback: () => {
        self.logger.debug('Starting unpark motion');
      },
      delay: 1000,
      postCallback: () => {
        self.queue.prependCommands(unparkDoneCommand);
        self.logger.debug('Done with unpark motion');
      }
    };

    if (self.fsm.current === 'parking') {
      commandArray.push({
        postCallback: () => {
          self.fsm.unpark();
        }
      });
    }

    commandArray.push(unparkMotion);
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
