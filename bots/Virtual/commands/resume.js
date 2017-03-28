module.exports = function resume(self, params) {
  if (self.currentJob === undefined) {
    throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
  }
  if (self.fsm.current !== 'paused') {
    throw new Error(`Cannot resume bot from state "${self.fsm.current}"`);
  }
  if (self.currentJob.fsm.current !== 'paused') {
    throw new Error(`Cannot resume job from state "${self.currentJob.fsm.current}"`);
  }

  const commandArray = [];

  // Resume the bot
  self.fsm.resume();

  // Resume the job
  commandArray.push({
    postCallback: async () => {
      self.currentJob.resume();
    },
  });

  // Move the gantry wherever you want
  commandArray.push({ delay: 1000 });

  // confirm the bot is now resumed
  commandArray.push({
    postCallback: () => {
      self.fsm.resumeDone();
    },
  });

  self.queue.queueCommands(commandArray);
  self.currentJob.lr.resume();
  return self.getBot();
};
