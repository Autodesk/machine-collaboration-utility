const request = require('request-promise');
const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));


module.exports = function cancel(self) {
  try {
    if (!botFsmDefinitions.metaStates.processingJob.includes(self.fsm.current)) {
      throw new Error(`Cannot cancel Conductor from state "${self.fsm.current}"`);
    }
    if (self.currentJob === undefined) {
      throw new Error(`Conductor should currently have a job associated with it.`);
    }
    if (!jobFsmDefinitions.metaStates.processingJob.includes(self.currentJob.fsm.current)) {
      throw new Error(`Cannot cancel Conductor job from state ${self.currentJob.fsm.current}`);
    }

    self.fsm.cancel();

    const players = self.settings.custom.players;
    players.forEach(async (player) => {
        // Cancel each bot
      const cancelJobParams = {
        method: 'POST',
        uri: player.endpoint,
        body: {
          command: 'cancel',
        },
        json: true,
      };

      await request(cancelJobParams)
      .catch(ex => {
        self.logger.error('Cancel fail', ex);
      });
    });

    self.currentJob.fsm.cancel();
    self.currentJob = undefined;
    self.fsm.cancelDone();
  } catch (ex) {
    self.logger.error(ex);
  }

  return self.getBot();
};
