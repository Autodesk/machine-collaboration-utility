module.exports = async function removePlayer(self, params) {
  try {
    const name = params.name;
    if (name === undefined) {
      throw '"name" is undefined';
    }

    const players = self.settings.custom.players;
    let playerRemoved = false;
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      if (player.name === name) {
        players.splice(i, 1);
        playerRemoved = true;
        break;
      }
    }

    if (!playerRemoved) {
      throw `Player "${name}" could not be found.`;
    }
    await self.updateBot({ custom: self.settings.custom });
  } catch (ex) {
    self.logger.error('error', ex);
    return ex;
  }
  return self.getBot();
};
