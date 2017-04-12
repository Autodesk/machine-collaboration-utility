const _ = require('lodash');
const ip = require('ip');
const request = require('request-promise');
const path = require('path');

const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

// Criteria to be a local player
// 1. Must have an identical ip address or be 'localhost'
// 2. Port must be either nonexistent (in the case of port 80) or identical to process.env.PORT
function isLocalPlayer(player) {
  return (
    (player.endpoint.includes('localhost') || player.endpoint.includes(ip.address())) &&
    (player.endpoint.includes(String(process.env.PORT)) || process.env.PORT === '80')
  );
}

async function checkConnection(self) {
  // ping each bot
  // If they're all connected, then we are done connecting
  let connectionDone = true;
  await Promise.map(self.settings.custom.players, async (player) => {
    const checkParams = {
      method: 'GET',
      uri: player.endpoint,
      json: true,
    };
    const reply = await request(checkParams);
    if (!botFsmDefinitions.metaStates.connected.includes(reply.data.state)) {
      connectionDone = false;
    }
  });

  if (connectionDone) {
    // Then enable the conductor updater function
    self.commands.toggleUpdater(self, { update: true });
    // Then you're done
    self.fsm.connectDone();
  } else {
    await Promise.delay(2000);
    checkConnection(self);
  }
}

module.exports = async function connect(self, params) {
  try {
    if (self.fsm.current !== 'ready') {
      throw new Error(`Cannot connect from state "${self.fsm.current}"`);
    }
    self.fsm.connect();

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
    checkConnection(self);
  } catch (ex) {
    self.logger.error(ex);
    self.fsm.connectFail();
  }
  return self.getBot();
};
