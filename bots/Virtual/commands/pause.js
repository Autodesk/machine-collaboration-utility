module.exports = async function pause(self, params) {
  if (self.currentJob === undefined) {
    throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
  }
  if (self.fsm.current !== 'executingJob') {
    throw new Error(`Cannot pause bot from state "${self.fsm.current}"`);
  }
  if (self.currentJob.fsm.current !== 'running') {
    throw new Error(`Cannot pause job from state "${self.currentJob.fsm.current}"`);
  }

  const commandArray = [];

  // Pause the bot
  console.log('paused the bot', self.settings.name);
  self.fsm.pause();

  // Pause the job
  commandArray.push({
    postCallback: async () => {
      console.log('paused the job');
      await self.currentJob.pause();
    },
  });

  // Move the gantry wherever you want
  commandArray.push({ delay: 1000 });

  // confirm the bot is now paused
  commandArray.push({
    postCallback: () => {
      console.log('pause done');
      self.fsm.pauseDone();
    },
  });

  self.queue.queueCommands(commandArray);
  console.log('just queued the pause commands');
  return self.getBot();
};
