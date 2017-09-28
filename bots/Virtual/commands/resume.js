/* global logger */
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

    if (self.fsm.current === 'pausing') {
      commandArray.push({
        postCallback: () => {
          self.fsm.resume();
        },
      });
    }

    const unparkCommands = self.commands.generateUnparkCommands(self);
    if (Array.isArray(unparkCommands)) {
      commandArray.push(...unparkCommands);
    } else {
      commandArray.push(unparkCommands);
    }


    if (self.parkedPosition !== undefined) {
      commandArray.push(`G92 E${self.parkedPosition.e}`);
      commandArray.push(`G1 X${self.parkedPosition.x} Y${self.parkedPosition.y} Z${self.parkedPosition.z} F2000`);
    }

    commandArray.push({
      code: self.info.clearBufferCommand,
      postCallback: () => {
        self.parkedPosition = undefined;
        logger.debug('Done with resume motion');
      },
    });

    commandArray.push({
      postCallback: () => {
        function capitalizeFirstLetter(string) {
          return string.charAt(0).toUpperCase() + string.slice(1);
        }

        const command = `resume${capitalizeFirstLetter(self.pauseableState)}`;
        // Resume the bot
        logger.info('captured command', command);
        self.fsm[command]();
        if (self.pauseableState === 'executingJob') {
          self.lr.resume();
        }
      },
    });

    commandArray.push({
      postCallback: () => {
        logger.debug('Resuming job');
        // Resume the job
        self.currentJob.resume();
      },
    });

    if (self.fsm.current === 'paused') {
      self.fsm.resume();
    }

    self.queue.queueSequentialCommands(commandArray);
  } catch (ex) {
    logger.error('Resume error', ex);
    if (ex instanceof Error) {
      throw ex;
    } else {
      throw new Error('Resume error', ex);
    }
  }
  return self.getBot();
};
