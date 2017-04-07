const request = require('request-promise');
const Promise = require('bluebird');

module.exports = async function pause(self, params) {
  // TODO should not be able to pause unless all players are running
  if (self.currentJob === undefined) {
    throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
  }
  if (self.fsm.current !== 'executingJob') {
    throw new Error(`Cannot pause bot from state "${self.fsm.current}"`);
  }
  if (self.currentJob.fsm.current !== 'running') {
    throw new Error(`Cannot pause job from state "${self.currentJob.fsm.current}"`);
  }

  try {
    self.pauseableState = self.fsm.current;
    self.fsm.pause();
    const players = self.settings.custom.players;
    await Promise.map(players, async (player) => {
      // Ping each job for status
      const pauseParams = {
        method: 'POST',
        uri: player.endpoint,
        body: { command: 'pause' },
        json: true,
      };

      const pauseReply = await request(pauseParams)
      .catch(ex => {
        self.logger.error('Pause fail', ex);
      });

      self.logger.info('Paused bot', player, pauseReply);
    });

    self.currentJob.pause();
    self.fsm.pauseDone();
  } catch (ex) {
    self.logger.error(ex);
  }
  return self.getBot();
};
