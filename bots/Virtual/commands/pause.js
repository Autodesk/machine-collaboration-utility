const path = require('path');

const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));

module.exports = async function pause(self) {
  try {
    // Idempotent pause command
    if (self.fsm.current === 'paused' || self.fsm.current === 'pausing') {
      return;
    }
    if (self.currentJob === undefined) {
      throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
    }
    if (!botFsmDefinitions.metaStates.pauseable.includes(self.fsm.current)) {
      throw new Error(`Cannot pause bot from state "${self.fsm.current}"`);
    }
    if (self.currentJob.fsm.current !== 'running') {
      throw new Error(`Cannot pause job from state "${self.currentJob.fsm.current}"`);
    }

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

    const parkCommands = self.commands.generateParkCommands(self);
    parkCommands.push({
      postCallback: () => {
        self.queue.prependCommands({
          postCallback: () => {
            self.fsm.pauseDone();
          },
        });
      },
    });

    const commandArray = [];
    // Pause the job
    commandArray.push({
      postCallback: () => {
        self.logger.debug('Starting pause command');
        // This line of code is not being reached.
        self.currentJob.pause();
        // Note, we don't return the pause request
        // until the initial pause command is processed by the queue
        self.queue.prependCommands(parkCommands);
      },
    });

    if (self.fsm.current === 'blocking' || self.fsm.current === 'unblocking') {
      commandArray.unshift({
        postCallback: () => {
          self.pauseableState = self.fsm.current;
          self.fsm.pause();
          self.logger.debug('Just queued pause', self.getBot().settings.name, self.fsm.current);
        },
      });
      self.queue.queueCommands(commandArray);
    } else {
      self.pauseableState = self.fsm.current;
      self.fsm.pause();
      self.queue.prependCommands(commandArray);
      self.logger.debug('Just queued pause', self.getBot().settings.name, self.fsm.current);
    }
  } catch (ex) {
    self.logger.error('Pause error', ex);
  }

  return self.getBot();
};
