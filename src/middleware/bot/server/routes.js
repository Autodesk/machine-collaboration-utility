/**
 * Handle all logic at this endpoint for reading all of the jobs
 */
const getBot = (self) => {
  self.router.get(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      ctx.body = self.getBot();
    } catch (ex) {
      ctx.body = { status: `Bot API "Get bot" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for sending a command to the bot
 */
const processBotCommand = (self) => {
  self.router.post(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const command = ctx.request.body.command;
      if (command) {
        ctx.body = await self.processCommand(command);
      } else {
        throw `Command is undefined.`;
      }
    } catch (ex) {
      ctx.body = { status: `Bot command request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

const botRoutes = (self) => {
  getBot(self);
  processBotCommand(self);
};

module.exports = botRoutes;
