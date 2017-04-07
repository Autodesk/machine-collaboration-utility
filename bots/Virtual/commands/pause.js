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

    const pauseEndCommand = {
      postCallback: () => {
        self.fsm.pauseDone();
      },
    };

    const pauseMovementCommand = {
      delay: 1000,
      postCallback: () => {
        self.queue.prependCommands(pauseEndCommand);
      }
    };

    const pausePromise = new Promise((resolve, reject) => {
      console.log('starting a promise');
      // Pause the job
      self.queue.prependCommands({
        postCallback: () => {
          // This line of code is not being reached.
          self.fsm.pause();
          self.currentJob.pause();
          // Note, we don't return the pause request until the initial pause command is processed by the queue
          self.queue.prependCommands(pauseMovementCommand);
          resolve(self.getBot());
          return true;
        },
      });

      self.queue.prependCommands(commandArray);
      self.pausableState = self.fsm.current;
    });

    pauseReply = await pausePromise;
  } catch (ex) {
    console.log('wtf', ex);
  }

  return pauseReply;
};
