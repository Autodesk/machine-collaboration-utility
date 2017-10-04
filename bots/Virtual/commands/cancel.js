/* global logger */
const path = require('path');

const botFsmDefinitions = require(path.join(process.env.PWD, 'server/middleware/bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'server/middleware/jobs/jobFsmDefinitions'));

module.exports = function cancel(self) {
  try {
    if (self.currentJob === undefined) {
      throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
    }
    if (!botFsmDefinitions.metaStates.processingJob.includes(self.fsm.current)) {
      throw new Error(`Cannot cancel bot from state "${self.fsm.current}"`);
    }
    if (!jobFsmDefinitions.metaStates.processingJob.includes(self.currentJob.fsm.current)) {
      throw new Error(`Cannot cancel job from state "${self.currentJob.fsm.current}"`);
    }

    const commandArray = [];

    // cancel the bot
    self.queue.clear();
    self.fsm.cancel();
    delete self.status.checkpoint;
    delete self.status.collaborators;
    delete self.status.blocker;

    // cancel the job
    commandArray.push({
      postCallback: () => {
        self.currentJob.cancel();
      },
    });

    // Move the gantry wherever you want
    commandArray.push({ delay: 1000 });

    // confirm the bot is now canceled
    commandArray.push({
      postCallback: () => {
        self.fsm.cancelDone();
        self.currentJob = undefined;
        self.app.io.broadcast('botEvent', {
          uuid: self.settings.uuid,
          event: 'update',
          data: self.getBot(),
        });
      },
    });

    self.queue.queueCommands(commandArray);
  } catch (ex) {
    logger.error('Cancel fail', ex);
  }
  return self.getBot();
};
