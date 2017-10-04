/* global logger */
const request = require('request-promise');
const path = require('path');

const botFsmDefinitions = require(path.join(process.env.PWD, 'server/middleware/bots/botFsmDefinitions'));

async function checkDisconnection(self) {
  // ping each bot
  // If they're all connected, then we are done connecting
  let disconnectionDone = true;
  await Promise.map(self.settings.custom.players, async (player) => {
    const checkParams = {
      method: 'GET',
      uri: player.endpoint,
      json: true,
    };
    const reply = await request(checkParams);
    if (
      botFsmDefinitions.metaStates.connected.includes(reply.data.state)
      ||
      reply.data.state === 'disconnecting'
    ) {
      disconnectionDone = false;
    }
  });

  if (disconnectionDone) {
    // Then you're done
    self.fsm.disconnectDone();
  } else {
    await Promise.delay(2000);
    checkDisconnection(self);
  }
}

module.exports = async function disconnect(self) {
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
        logger.error('Disconnect player request fail', ex);
      }
    });

    // TODO actually check this
    self.commands.toggleUpdater(self, { update: false });
    checkDisconnection(self);
  } catch (ex) {
    logger.error(ex);
    self.fsm.disconnectFail();
  }

  return self.getBot();
};
