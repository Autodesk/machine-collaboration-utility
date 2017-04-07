const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function park(self, params) {
  try {
    if (self.fsm.current !== 'executingJob') {
      throw new Error(`Cannot park from state "${self.fsm.current}"`);
    }
    const commandArray = [];

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

    self.queue.prependCommands({
      preCallback: () => {
        self.logger.debug('Starting park movements');
      },
      delay: 1000,
      postCallback: () => {
        self.logger.debug('Done with park movements');
        self.queue.prependCommands(parkEndCommand);
      }
    });

    self.logger.debug('Just queued park', self.getBot().settings.name, self.fsm.current);
    self.fsm.park();
  } catch (ex) {
    self.logger.error('Park error', ex);
  }

  return self.getBot();
};
