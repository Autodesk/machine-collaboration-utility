/* global logger */
module.exports = async function unblock(self, params) {
  try {
    if (self.fsm.current === 'executingJob') {
      const commandArray = [];

      const unparkCommands = self.commands.generateUnparkCommands(self);
      if (Array.isArray(unparkCommands)) {
        commandArray.push(...unparkCommands);
      } else {
        commandArray.push(unparkCommands);
      }

      commandArray.push({
        postCallback: () => {
          self.lr.resume();
        },
      });

      self.queue.queueSequentialCommands(commandArray);
    } else {
      if (!(self.fsm.current === 'blocked' || self.fsm.current === 'blocking')) {
        throw new Error(`Cannot unblock from state "${self.fsm.current}"`);
      }

      const commandArray = [];

      commandArray.push({
        postCallback: () => {
          logger.debug('Starting unblock motion', params);
          self.fsm.unblock();
        },
      });

      if (params.dry === false) {
        const unparkCommands = self.commands.generateUnparkCommands(self);
        if (Array.isArray(unparkCommands)) {
          commandArray.push(...unparkCommands);
        } else {
          commandArray.push(unparkCommands);
        }
      }

      commandArray.push({
        postCallback: () => {
          self.fsm.unblockDone();
          self.lr.resume();
          logger.debug('Done with unblock motion');
        },
      });

      self.queue.queueSequentialCommands(commandArray);
    }
  } catch (ex) {
    logger.error('Unblock error', ex);
  }
  return self.getBot();
};
