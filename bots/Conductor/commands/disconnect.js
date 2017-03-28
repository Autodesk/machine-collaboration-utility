const request = require('request-promise');
const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function disconnect(self, params) {
  try {
    if (!botFsmDefinitions.metaStates.connected.includes(self.fsm.current)) {
      throw new Error(`Cannot disconnect from state "${self.fsm.current}"`);
    }
    self.fsm.disconnect();

    const players = self.settings.custom.players;
    players.forEach(async (player) => {
      const connectParams = {
        method: 'POST',
        uri: player.endpoint,
        body: {
          command: 'disconnect',
        },
        json: true,
      };

      try {
        await request(connectParams);
      } catch (ex) {
        self.logger.error('Disconnect player request fail', ex);
      }
    });

    // TODO actually check this
    self.commands.toggleUpdater(self, { update: false });
    self.fsm.disconnectDone();
  } catch (ex) {
    self.logger.error(ex);
    self.fsm.disconnectFail();
  }

  return self.getBot();
};
