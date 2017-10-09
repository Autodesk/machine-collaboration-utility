/* global logger */
module.exports = function checkPrecursors(self) {
  if (
    self.status.blocker !== undefined &&
    self.status.blocker.bot !== undefined &&
    self.status.blocker.checkpoint !== undefined
  ) {
    logger.info('Checking precursors for bot', self.getBot());
    const blockingBotCurrentCheckpoint = self.status.collaborators[self.status.blocker.bot];
    // If the precursor is complete then move on
    if (blockingBotCurrentCheckpoint > self.status.blocker.checkpoint) {
      self.status.blocker = undefined;
      if (self.fsm.current === 'executingJob' || self.fsm.current === 'blocked') {
        // If ready to accept new lines of code, then do so immediately
        self.lr.resume();
      } else if (self.fsm.current === 'blocking') {
        // If not ready for a new line yet, queue to resume after done blocking
        self.queue.queueCommands({
          postCallback: () => {
            self.lr.resume();
          },
        });
      }
    } else {
      // If the precursor is not complete, then block
      self.queue.queueCommands({
        postCallback: () => {
          // Idempotent block
          if (self.fsm.current === 'blocked' || self.fsm.current === 'blocking') {
            return;
          }

          if (self.fsm.current === 'executingJob') {
            self.commands.block(self);
          } else {
            logger.error(`Cannot block from state "${self.fsm.current}"`);
          }
        },
      });
    }
  }
};
