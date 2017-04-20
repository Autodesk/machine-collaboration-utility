module.exports = async function unblock(self, params) {
  try {
    if (self.fsm.current === 'executingJob') {
      const commandArray = [
        // generateUnparkCommands(self),
        {
          postCallback: () => {
            self.lr.resume();
          },
        },
      ];
      self.queue.queueCommands(commandArray);
    } else {
      if (!(self.fsm.current === 'blocked' || self.fsm.current === 'blocking')) {
        throw new Error(`Cannot unblock from state "${self.fsm.current}"`);
      }

      const commandArray = [];

      const unblockDoneCommand = {
        postCallback: () => {
          self.fsm.unblockDone();
          self.lr.resume();
        },
      };

      const unblockMotion = {
        preCallback: () => {
          self.logger.debug('Starting unblock motion');
        },
        delay: 1000,
        postCallback: () => {
          self.queue.prependCommands(unblockDoneCommand);
          self.logger.debug('Done with unblock motion');
        },
      };

      if (self.fsm.current === 'blocking') {
        commandArray.push({
          postCallback: () => {
            self.fsm.unblock();
          },
        });
      }

      commandArray.push(unblockMotion);
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
