module.exports = function(self, params) {
  const bot = params.bot;
  if (bot === undefined) {
    throw 'Param "bot" is undefined';
  }

  const checkpoint = params.checkpoint;
  if (checkpoint === undefined) {
    throw 'Param "checkpoint" is undefined';
  }
  self.logger.info('updating bot checkpoints', bot, checkpoint, self.collaboratorCheckpoints);
  self.collaboratorCheckpoints[bot] = checkpoint;
  self.logger.info(`Just updated bot ${bot} to checkpoint ${checkpoint}`, JSON.stringify(self.collaboratorCheckpoints));
  self.commands.updatePlayers(self);
};
