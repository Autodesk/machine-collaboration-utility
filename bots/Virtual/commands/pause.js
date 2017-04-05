const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function pause(self, params) {
  let pauseReply = self.getBot();
  try {
    if (self.currentJob === undefined) {
      throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
    }
    if (!botFsmDefinitions.metaStates.pauseable.includes(self.fsm.current)) {
      throw new Error(`Cannot pause bot from state "${self.fsm.current}"`);
    }
    if (self.currentJob.fsm.current !== 'running') {
      throw new Error(`Cannot pause job from state "${self.currentJob.fsm.current}"`);
    }

    const commandArray = [];

    const pausePromise = new Promise((resolve, reject) => {
      // Pause the job
      commandArray.push({
        processData: () => {
          // This line of code is not being reached.
          self.fsm.pause();
          self.currentJob.pause();
          // Note, we don't return the pause request until the initial pause command is processed by the queue
          resolve(self.getBot());
          return true;
        },
      });

      // Move the gantry wherever you want
      commandArray.push({ delay: 1000 });

      // confirm the bot is now paused
      commandArray.push({
        processData: () => {
          self.fsm.pauseDone();
          return true
        },
      });

      self.queue.prependCommands(commandArray);
      console.log('just queued pause, 1 second, pause done');
      self.pausableState = self.fsm.current;
    });

    pauseReply = await pausePromise;
  } catch (ex) {
    console.log('wtf', ex);
  }

  return pauseReply;
};
