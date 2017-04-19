const request = require('request-promise');

module.exports = async function updatePlayers(self) {
  try {
    for (const player of self.settings.custom.players) {
      const updatePlayerParams = {
        method: 'POST',
        uri: player.endpoint,
        body: {
          command: 'updateCollaboratorCheckpoints',
          collaborators: self.collaboratorCheckpoints,
        },
        json: true,
      };
      const updateCollaboratorReply = await request(updatePlayerParams);
    }
  } catch (ex) {
    self.logger.error(ex);
  }
};
