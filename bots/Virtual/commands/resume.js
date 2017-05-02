module.exports = async function resume(self) {
  try {
    if (self.currentJob === undefined) {
      throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
    }
    if (self.currentJob.fsm.current !== 'paused') {
      throw new Error(`Cannot resume ${self.settings.name} job from state "${self.currentJob.fsm.current}"`);
    }

    if (!(self.fsm.current === 'paused' || self.fsm.current === 'pausing')) {
      throw new Error(`Cannot resume bot ${self.settings.name} from state "${self.fsm.current}"`);
    }

    if (self.warnings.length > 0) {
      throw new Error(`Cannot resume bot ${self.settings.name} with unresolved warnings`, self.warnings);
    }

    const commandArray = [];

    const resumeDoneCommand = {
      postCallback: () => {
        function capitalizeFirstLetter(string) {
          return string.charAt(0).toUpperCase() + string.slice(1);
        }

        const command = `resume${capitalizeFirstLetter(self.pauseableState)}`;
        // Resume the bot
        self.logger.info('captured command', command);
        self.fsm[command]();
        if (self.pauseableState === 'executingJob') {
          self.lr.resume();
        }
      },
    };

    const resumeMotion = [
      self.commands.generateUnparkCommands(self),
      {
        code: self.parkedPosition === undefined ? 'M114' : `G92 E${self.parkedPosition.e}`,
      },
      {
        code: self.parkedPosition === undefined ? 'M114' : `G1 X${self.parkedPosition.x} Y${self.parkedPosition.y} Z${self.parkedPosition.z} F2000`
      },
      {
        preCallback: () => {
          self.logger.debug('Starting resume motion');
        },
        code: self.info.clearBufferCommand,
        postCallback: () => {
          self.parkedPosition = undefined;
          self.queue.prependCommands(resumeDoneCommand);
          self.logger.debug('Done with resume motion');
        },
      },
    ];

    const resumeStartCommand = {
      postCallback: () => {
        self.logger.debug('starting resume commands');
        self.queue.prependCommands(resumeMotion);
        // Resume the job
        self.currentJob.resume();
      },
    };

    if (self.fsm.current === 'pausing') {
      commandArray.push({
        postCallback: () => {
          self.fsm.resume();
        },
      });
    }

    commandArray.push(resumeStartCommand);
    self.queue.queueCommands(commandArray);

    // Queue the resume command if currently 'pausing'
    if (self.fsm.current === 'paused') {
      // Resume the bot
      self.fsm.resume();
    }
  } catch (ex) {
    self.logger.error('Resume error', ex);
    if (ex instanceof Error) {
      throw ex;
    } else {
      throw new Error('Resume error', ex);
    }
  }
  return self.getBot();
};
