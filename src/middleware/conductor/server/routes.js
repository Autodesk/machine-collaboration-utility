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

const conductorRoutes = (self) => {
  getConductor(self);
  processConductorCommand(self);
};

module.exports = conductorRoutes;
