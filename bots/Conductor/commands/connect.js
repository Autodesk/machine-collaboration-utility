const _ = require('lodash');
const ip = require('ip');
const request = require('request-promise');

function isLocalPlayer(player) {
  return player.endpoint.includes(ip.address()) || player.endpoint.includes('localhost');
}

// If the database doesn't yet have printers for the endpoints, create them
async function setupConductorArms(self, params) {
  try {
    // Sweet through every player
    const players = self.settings.custom.players;

    for (const player of players) {
      // Check if a bot exists with that end point
      let created = false;
      for (const [botUuid, bot] of _.entries(self.app.context.bots.botList)) {
        if (
          (
            bot.settings.endpoint === player.endpoint &&
            bot.settings.name === player.name
          ) ||
          isLocalPlayer(player)
        ) {
          created = true;
        }
      }

      // If it doesn't, create it
      if (!created) {
        try {
          const newBot = await this.app.context.bots.createPersistentBot({
            name: player.name,
            endpoint: player.endpoint,
            model: self.info.conductorPresets.botModel,
          });

          self.logger.info('Just created bot', newBot.getBot());
        } catch (ex) {
          self.logger.error('Create bot fail', ex);
        }
      }
    }
  } catch (ex) {
    self.logger.error(ex);
  }
}

module.exports = async function connect(self, params) {
  try {
    if (self.fsm.current !== 'ready') {
      throw new Error(`Cannot connect from state "${self.fsm.current}"`);
    }
    self.fsm.connect();
    await setupConductorArms(self);

    // Go through each player and connect it

    const players = self.settings.custom.players;

    for (const player of players) {
      const connectParams = {
        method: 'POST',
        uri: player.endpoint,
        body: {
          command: 'connect',
        },
        json: true,
      };
      try {
        await request(connectParams);
      } catch (ex) {
        self.logger.error('Connect player request fail', ex, connectParams);
      }
    }

    // Then enable the conductor updater function
    self.commands.toggleUpdater(self, { update: true });

    // Then you're done
    self.fsm.connectDone();
  } catch (ex) {
    self.logger.error(ex);
    self.fsm.connectFail();
  }
  return self.getBot();
};
