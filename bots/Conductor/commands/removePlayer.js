/* global logger */
module.exports = async function removePlayer(self, params) {
  try {
    const name = params.name;
    if (name === undefined) {
      throw new Error('"name" is undefined');
    }

    const players = self.settings.custom.players;
    let playerRemoved = false;
    players.forEach((player, i) => {
      if (player.name === name) {
        players.splice(i, 1);
        playerRemoved = true;
      }
    });

    if (!playerRemoved) {
      throw new Error(`Player "${name}" could not be found.`);
    }
    await self.updateBot({ custom: self.settings.custom });
  } catch (ex) {
    logger.error('error', ex);
    return ex;
  }
  return self.getBot();
};
