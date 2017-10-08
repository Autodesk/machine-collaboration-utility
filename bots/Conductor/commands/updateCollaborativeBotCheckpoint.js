/* global logger */
module.exports = function updateCollaborativeBotCheckpoint(self, params) {
  const bot = params.bot;
  if (bot === undefined) {
    throw new Error('Param "bot" is undefined');
  }

  const checkpoint = params.checkpoint;
  if (checkpoint === undefined) {
    throw new Error('Param "checkpoint" is undefined');
  }
  logger.info('updating bot checkpoints', bot, checkpoint, self.collaboratorCheckpoints);
  self.collaboratorCheckpoints[bot] = checkpoint;
  logger.info(
    `Just updated bot ${bot} to checkpoint ${checkpoint}`,
    JSON.stringify(self.collaboratorCheckpoints),
  );
  self.commands.updatePlayers(self);
};
