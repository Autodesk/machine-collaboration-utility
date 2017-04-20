const request = require('request-promise');
const path = require('path');

const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

async function checkCancel(self) {
  // ping each bot
  // If they're all caneled, then we are done canceling
  let cancelDone = true;
  await Promise.map(self.settings.custom.players, async (player) => {
    const checkParams = {
      method: 'GET',
      uri: player.endpoint,
      json: true,
    };
    const reply = await request(checkParams);
    if (
      botFsmDefinitions.metaStates.processingJob.includes(reply.data.state)
      ||
      reply.data.state === 'cancelingJob'
    ) {
      cancelDone = false;
    }
  });

  if (cancelDone) {
    self.currentJob.fsm.cancel();
    self.currentJob = undefined;
    self.fsm.cancelDone();
  } else {
    await Promise.delay(2000);
    checkCancel(self);
  }
}


module.exports = function cancel(self) {
  try {
    if (!botFsmDefinitions.metaStates.processingJob.includes(self.fsm.current)) {
      throw new Error(`Cannot cancel Conductor from state "${self.fsm.current}"`);
    }
    if (self.currentJob === undefined) {
      throw new Error('Conductor should currently have a job associated with it.');
    }
    if (!jobFsmDefinitions.metaStates.processingJob.includes(self.currentJob.fsm.current)) {
      throw new Error(`Cannot cancel Conductor job from state ${self.currentJob.fsm.current}`);
    }

    self.fsm.cancel();
    try {
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
        .catch((ex) => { self.logger.error('Cancel fail', ex); });
      });
      checkCancel(self);
    } catch (ex) {
      self.logger.error('Check cancel error', ex);
    }
  } catch (ex) {
    self.logger.error(ex);
  }

  return self.getBot();
};
