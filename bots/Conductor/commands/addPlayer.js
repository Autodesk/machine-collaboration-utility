module.exports = async function addPlayer(self, params) {
  try {
    const name = params.name;
    if (name === undefined) {
      throw new Error('"name" is undefined');
    }

    const endpoint = params.endpoint;
    if (endpoint === undefined) {
      throw new Error('"endpoint" is undefined');
    }

    const playerArray = self.settings.custom.players;

    // Check for duplicate names or endpoints
    playerArray.forEach((player) => {
      if (player.name === name) {
        throw new Error(`Duplicate name "${name}".`);
      }
      if (player.endpoint === endpoint) {
        throw new Error(`Duplicate endpoint "${endpoint}".`);
      }
    });

    playerArray.push({ name, endpoint });
    self.settings.custom.players = playerArray;
    await self.updateBot({ custom: { players: playerArray } });
    // should update the database version of this
    return self.getBot();
  } catch (ex) {
    self.logger.error('Add player error', ex);
    throw new Error('Add player error', ex);
  }
};
