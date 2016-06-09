/**
 * Handle all logic at this endpoint for reading all of the jobs
 */
const getConductor = (self) => {
  self.router.get(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      ctx.body = self.getConductor();
    } catch (ex) {
      ctx.body = { status: `Conductor API "Get Conductor" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for sending a command to the bot
 */
const processConductorCommand = (self) => {
  self.router.post(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const command = ctx.request.body.command;
      if (command) {
        ctx.body = await self.processCommand(command);
      } else {
        throw `Command is undefined.`;
      }
    } catch (ex) {
      ctx.body = { status: `Conductor command request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for when an update is received
 */
const handleBotUpdates = (self) => {
  self.router.post(`${self.routeEndpoint}/update`, async (ctx) => {
    try {
      const botId = ctx.request.body.botId;
      const jobUuid = ctx.request.body.jobUuid;
      if (botId === undefined) {
        throw `Command is undefined.`;
      }
      if (jobUuid === undefined) {
        throw `jobUuid is undefined.`;
      }
      ctx.body = await self.handleBotUpdates(botId, jobUuid);
    } catch (ex) {
      ctx.body = { status: `Conductor command request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

const conductorRoutes = (self) => {
  getConductor(self);
  processConductorCommand(self);
  handleBotUpdates(self);
};

module.exports = conductorRoutes;
