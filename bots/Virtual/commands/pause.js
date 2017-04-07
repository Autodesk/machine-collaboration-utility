const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function pause(self, params) {
  try {
    if (self.currentJob === undefined) {
      throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
    }
    if (!botFsmDefinitions.metaStates.pauseable.includes(self.fsm.current)) {
      throw new Error(`Cannot pause bot from state "${self.fsm.current}"`);
    }
    if (self.currentJob.fsm.current !== 'running') {
      throw new Error(`Cannot pause job from state "${self.currentJob.fsm.current}"`);
    }

    const commandArray = [];

    // We want pause to happen in a very specific order
    // 1. Start pause from the state machine immediately
    // 2. Allow for pause movements / macros / etc
    // 3. Complete state machine pause transition by signaling that pause is complete
    //
    // In order to accomplish this, we must prepend the current commands in the queue
    // We prepend 1
    // We call the state machine command "pause"
    // In the postCallback of 1, we prepend 2 to the queue
    // Then in the postCallback of 2, we prepend 3 to the queue
    //
    // This comes across a bit backwards, but the ordering is necessary in order to prevent
    // transitioning to an incorrect state

    const pauseEndCommand = {
      postCallback: () => {
        self.fsm.pauseDone();
      },
    };

    const pauseMovementCommand = {
      preCallback: () => {
        self.logger.debug('Starting pause movements');
      },
      delay: 10000,
      postCallback: () => {
        self.logger.debug('Completed pause movements');
        self.queue.prependCommands(pauseEndCommand);
      }
    };

    // Pause the job
    self.queue.prependCommands({
      postCallback: () => {
        self.logger.debug('Starting pause command');
        // This line of code is not being reached.
        self.currentJob.pause();
        // Note, we don't return the pause request until the initial pause command is processed by the queue
        self.queue.prependCommands(pauseMovementCommand);
      },
    });

    self.queue.prependCommands(commandArray);
    self.logger.debug('Just queued pause', self.getBot().settings.name, self.fsm.current);
    self.pauseableState = self.fsm.current;
    self.fsm.pause();
  } catch (ex) {
    self.logger.error('Pause error', ex);
  }

  return self.getBot();
};
