const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function resume(self, params) {
  let resumePromise = self.getBot();
  try {
    if (self.currentJob === undefined) {
      throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
    }
    if (self.currentJob.fsm.current !== 'paused') {
      throw new Error(`Cannot resume ${self.settings.name} job from state "${self.currentJob.fsm.current}"`);
    }

    if (!(self.fsm.current === 'paused' || self.fsm.current === 'pausing')) {
      throw new Error(`Cannot resume bot ${self.settings.name} from state "${self.fsm.current}"`);
    }

    const commandArray = [];

    const resumeCommand = {
      postCallback: () => {
        function capitalizeFirstLetter(string) {
          return string.charAt(0).toUpperCase() + string.slice(1);
        }

        let command = 'resume' + capitalizeFirstLetter(self.pausableState);
        // Resume the bot
        self.fsm[command]();
        self.lr.resume();
      },
    };

    const resumeMotion = {
      delay: 1000,
      postCallback: () => {
        self.queue.prependCommands(resumeCommand);
      }
    };

    resumePromise = new Promise((resolve, reject) => {
      self.queue.queueCommands({

        postCallback: () => {
          self.queue.prependCommands(resumeMotion);

          // Resume the bot
          self.fsm.resume();
          // Resume the job
          self.currentJob.resume();
          resolve(self.getBot());
        },
      });
    });

  } catch (ex) {
    console.log('wtf', ex);
  }
  return await resumePromise;
};
