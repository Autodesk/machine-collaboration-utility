module.exports = async function addPlayer(self, params) {
  try {
    const name = params.name;
    if (name === undefined) {
      throw '"name" is undefined';
    }

    const endpoint = params.endpoint;
    if (endpoint === undefined) {
      throw '"endpoint" is undefined';
    }

    const playerArray = self.settings.custom.players;

    // Check for duplicate names or endpoints
    for (const player of playerArray) {
      if (player.name === name) {
        throw `Duplicate name "${name}".`;
      }
      if (player.endpoint === endpoint) {
        throw `Duplicate endpoint "${endpoint}".`;
      }
    }

    playerArray.push({ name, endpoint });
    self.settings.custom.players = playerArray;
    await self.updateBot({ custom: { players: playerArray } });
    // should update the database version of this
    return self.getBot();
  } catch (ex) {
    self.logger.error('Add player error', ex);
    throw ex;
  }
};
