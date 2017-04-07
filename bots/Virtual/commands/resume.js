const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function resume(self, params) {
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

    const resumeDoneCommand = {
      postCallback: () => {
        function capitalizeFirstLetter(string) {
          return string.charAt(0).toUpperCase() + string.slice(1);
        }

        const command = 'resume' + capitalizeFirstLetter(self.pauseableState);
        // Resume the bot
        self.fsm[command]();
        self.lr.resume();
      },
    };

    const resumeMotion = {
      preCallback: () => {
        self.logger.debug('Starting resume motion');
      },
      delay: 1000,
      postCallback: () => {
        self.queue.prependCommands(resumeDoneCommand);
        self.logger.debug('Done with resume motion');
      }
    };

    const resumeStartCommand = {
      postCallback: () => {
        self.logger.debug('starting resume commands');
        self.queue.prependCommands(resumeMotion);
        // Resume the job
        self.currentJob.resume();
      },
    }

    if (self.fsm.current === 'pausing') {
      commandArray.push({
        postCallback: () => {
          self.fsm.resume();
        }
      });
    }

    commandArray.push(resumeStartCommand);
    self.queue.queueCommands(commandArray);

    // Queue the resume command if currently 'pausing'
    if (self.fsm.current === 'paused') {
      // Resume the bot
      self.fsm.resume();
    }

  } catch (ex) {
    self.logger.error('Resume error', ex);
  }
  return self.getBot();
};
