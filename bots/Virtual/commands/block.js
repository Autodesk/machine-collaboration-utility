module.exports = async function block(self) {
  try {
    if (self.fsm.current === 'blocked') {
      return self.lr.resume();
    }

    if (self.fsm.current !== 'executingJob') {
      throw new Error(`Cannot block from state "${self.fsm.current}"`);
    }
    // We want block to happen in a very specific order
    // 1. Start block from the state machine immediately
    // 2. Allow for block movements / macros / etc
    // 3. Complete state machine block transition by signaling that block is complete
    //
    // In order to accomplish this, we must prepend the current commands in the queue
    // We call the state machine command "block"
    // In the postCallback of 1, we prepend 2 to the queue
    // Then in the postCallback of 2, we prepend 3 to the queue
    //
    // This comes across a bit backwards, but the ordering is necessary in order to prevent
    // transitioning to an incorrect state

    const blockEndCommand = {
      postCallback: () => {
        self.fsm.blockDone();
      },
    };

    const parkCommands = self.commands.generateParkCommands(self);
    parkCommands.push({
      postCallback: () => {
        self.queue.prependCommands(blockEndCommand);
      },
    });

    self.queue.prependCommands(parkCommands);

    self.logger.debug('Just queued block', self.getBot().settings.name, self.fsm.current);
    self.fsm.block();
  } catch (ex) {
    self.logger.error('block error', ex);
  }

  return self.getBot();
};
