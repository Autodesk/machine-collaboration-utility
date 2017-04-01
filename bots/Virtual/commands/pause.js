const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function pause(self, params) {
  if (self.currentJob === undefined) {
    throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
  }
  if (!botFsmDefinitions.metaStates.pausable.includes(self.fsm.current)) {
    throw new Error(`Cannot pause bot from state "${self.fsm.current}"`);
  }
  if (self.currentJob.fsm.current !== 'running') {
    throw new Error(`Cannot pause job from state "${self.currentJob.fsm.current}"`);
  }

  const commandArray = [];

  // Pause the job
  commandArray.push({
    postCallback: () => {
      self.pausableState = self.fsm.current;
      self.fsm.pause();
      self.currentJob.pause();
    },
  });

  // Move the gantry wherever you want
  commandArray.push({ delay: 1000 });

  // confirm the bot is now paused
  commandArray.push({
    postCallback: () => {
      self.fsm.pauseDone();
    },
  });

  self.queue.queueCommands(commandArray);
  return self.getBot();
};
