/* global logger */
const path = require('path');

const sendTwilioUpdate = require(path.join(process.env.PWD, 'server/middleware/helpers/sendTwilioUpdate'));
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));

module.exports = async function pause(self) {
  try {
    // Idempotent pause command
    if (self.fsm.current === 'paused' || self.fsm.current === 'pausing') {
      throw new Error(`Cannot pause from state "${self.fsm.current}"`);
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

    const commandArray = [];

    if (self.fsm.current === 'blocking' || self.fsm.current === 'unblocking') {
      commandArray.push({
        postCallback: () => {
          self.pauseableState = self.fsm.current;
          self.fsm.pause();
          logger.info('Just queued pause', self.getBot().settings.name, self.fsm.current);
        },
      });
    } else {
      self.pauseableState = self.fsm.current;
      self.fsm.pause();
    }

    commandArray.push({
      postCallback: () => {
        logger.info('Starting pause command');
        self.currentJob.pause();
        // Note, we don't return the pause request
        // until the initial pause command is processed by the queue
      },
    });

    const parkCommands = self.commands.generateParkCommands(self)
    if (Array.isArray(parkCommands)) {
      commandArray.push(...parkCommands);
    } else {
      commandArray.push(parkCommands);
    }

    commandArray.push({
      code: self.info.clearBufferCommand,
      postCallback: () => {
        self.fsm.pauseDone();
        sendTwilioUpdate(`${self.settings.name} has been paused`);
      },
    });

    if (self.fsm.current === 'blocking' || self.fsm.current === 'unblocking') {
      self.queue.queueSequentialCommands(commandArray);
    } else {
      self.queue.prependSequentialCommands(commandArray);
      logger.info('Just queued pause', self.getBot().settings.name, self.fsm.current);
    }
  } catch (ex) {
    logger.error('Pause error', ex);
  }

  return self.getBot();
};
