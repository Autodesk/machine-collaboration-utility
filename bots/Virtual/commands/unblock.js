module.exports = async function unblock(self, params) {
  try {
    if (self.fsm.current === 'executingJob') {
      const commandArray = [
        self.commands.generateUnparkCommands(self),
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
      if (self.fsm.current === 'blocking') {
        commandArray.push({
          postCallback: () => {
            self.fsm.unblock();
          },
        });
      }
      commandArray.push({
        preCallback: () => {
          self.logger.debug('Starting unblock motion', params);
        },
      });

      if (params.dry === false) {
        commandArray.push(self.commands.generateUnparkCommands(self));
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
        },
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
