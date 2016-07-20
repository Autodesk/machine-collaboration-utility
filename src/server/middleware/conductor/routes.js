const Response = require(`../helpers/response`);

/**
 * Handle all logic at this endpoint for reading all of the jobs
 */
const getConductor = (self) => {
  const requestDescription = `Get Conductor`;
  self.router.get(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const reply = self.getConductor();
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, reply);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for sending a command to the bot
 */
const processConductorCommand = (self) => {
  const requestDescription = `Process Conductor Command`;
  self.router.post(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const command = ctx.request.body.command;
      if (command) {

        const params = {};
        for (const [paramKey, param] of Object.entries(ctx.request.body)) {
          if (paramKey !== `command`) {
            params[paramKey] = param;
          }
        }

        const reply = await self.processCommand(command, params);
        ctx.status = 200;
        ctx.body = new Response(ctx, requestDescription, reply);
      } else {
        throw `Command is undefined.`;
      }
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for when an update is received
 */
const handleBotUpdates = (self) => {
  const requestDescription = `Handle Bot Updates`;
  self.router.post(`${self.routeEndpoint}/update`, async (ctx) => {
    try {
      const botUuid = ctx.request.body.botUuid;
      if (botUuid === undefined) {
        throw `"botUuid" is undefined.`;
      }

      const jobUuid = ctx.request.body.jobUuid;
      if (jobUuid === undefined) {
        throw `jobUuid is undefined.`;
      }
      const reply = await self.handleBotUpdates(botUuid, jobUuid);
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, reply);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

const conductorRoutes = (self) => {
  getConductor(self);
  processConductorCommand(self);
  handleBotUpdates(self);
};

module.exports = conductorRoutes;
