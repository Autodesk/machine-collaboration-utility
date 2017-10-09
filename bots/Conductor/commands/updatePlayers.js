/* global logger */
const request = require('request-promise');
const bluebird = require('bluebird');

module.exports = async function updatePlayers(self) {
  try {
    await bluebird.map(self.settings.custom.players, async (player) => {
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
    logger.error(ex);
  }
};
