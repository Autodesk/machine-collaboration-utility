const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = function resume(self, params) {
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

    commandArray.push({
      postCallback: () => {

        // Resume the bot
        self.fsm.resume();
        // Resume the job
        self.currentJob.resume();
      },
    });

    // Move the gantry wherever you want
    commandArray.push({ delay: 1000 });

    // confirm the bot is now resumed
    commandArray.push({
      postCallback: () => {
        function capitalizeFirstLetter(string) {
          return string.charAt(0).toUpperCase() + string.slice(1);
        }

        let command = 'resumeJob' + capitalizeFirstLetter(self.pausableState);
        // Resume the bot
        self.fsm[command]();
      },
    });

    self.queue.queueCommands(commandArray);
    self.lr.resume();
  } catch (ex) {
    console.log('wtf', ex);
  }
  return self.getBot();
};
