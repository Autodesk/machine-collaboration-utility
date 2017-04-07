const request = require('request-promise');
const Promise = require('bluebird');

module.exports = async function resume(self) {
  try {
    // TODO should not be able to resume unless all players are paused
    if (self.currentJob === undefined) {
      throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
    }
    if (self.fsm.current !== 'paused') {
      throw new Error(`Cannot resume bot from state "${self.fsm.current}"`);
    }
    if (self.currentJob.fsm.current !== 'paused') {
      throw new Error(`Cannot resume job from state "${self.currentJob.fsm.current}"`);
    }

    self.fsm.resume();

    const players = self.settings.custom.players;
    await Promise.map(players, async (player) => {
      // Ping each job for status
      const resumeParams = {
        method: 'POST',
        uri: player.endpoint,
        body: { command: 'resume' },
        json: true,
      };

      const resumeReply = await request(resumeParams)
      .catch(ex => {
        self.logger.error('Resume conductor player fail', ex);
      });
    });

    self.currentJob.fsm.resume();
    function capitalizeFirstLetter(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }

    let command = 'resume' + capitalizeFirstLetter(self.pauseableState);
    // Resume the bot
    self.fsm[command]();
  } catch (ex) {
    self.logger.error(ex);
  }

  return self.getBot();
};
