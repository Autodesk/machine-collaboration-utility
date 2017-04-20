const request = require('request-promise');

module.exports = async function updatePlayers(self) {
  try {
    await Promise.map(self.settings.custom.players, async (player) => {
      const updatePlayerParams = {
        method: 'POST',
        uri: player.endpoint,
        body: {
          command: 'updateCollaboratorCheckpoints',
          collaborators: self.collaboratorCheckpoints,
        },
        json: true,
      };
      await request(updatePlayerParams);
    });
  } catch (ex) {
    self.logger.error(ex);
  }
};
