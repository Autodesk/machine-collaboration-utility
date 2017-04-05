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
      processData: () => {
        // Resume the bot
        self.fsm.resume();
        // Resume the job
        self.currentJob.resume();
        return true;
      },
    });

    // Move the gantry wherever you want
    commandArray.push({ delay: 1000 });

    // confirm the bot is now resumed
    commandArray.push({
      processData: () => {
        function capitalizeFirstLetter(string) {
          return string.charAt(0).toUpperCase() + string.slice(1);
        }

        let command = 'resume' + capitalizeFirstLetter(self.pausableState);
        // Resume the bot
        console.log('the command', command);
        self.fsm[command]();
        self.lr.resume();
        return true;
      },
    });

    self.queue.queueCommands(commandArray);
  } catch (ex) {
    console.log('wtf', ex);
  }
  return self.getBot();
};
