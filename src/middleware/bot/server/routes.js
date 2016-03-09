const Response = require(`../helpers/response`);

/**
 * Handle all logic at this endpoint for reading all of the jobs
 */
const getBot = (self) => {
  const requestDescription = `Get Bot`;
  self.router.get(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const botJson = self.getBot();
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, botJson);
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
const processBotCommand = (self) => {
  const requestDescription = `Process Bot Command`;
  self.router.post(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const command = ctx.request.body.command;
      if (command) {
        const commandReply = await self.processCommand(command);
        ctx.status = 200;
        ctx.body = new Response(ctx, requestDescription, commandReply);
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
 * Handle all logic at this endpoint for sending a command to the bot
 */
const processGcode = (self) => {
  const requestDescription = 'Process Gcode';
  self.router.post(`${self.routeEndpoint}/processGcode`, async (ctx) => {
    try {
      const gcode = ctx.request.body.gcode;
      if (gcode) {
        const commandQueued = await self.processGcode(gcode);
        if (commandQueued === undefined) {
          const reply = `Cannot send gcode from state ${self.fsm.current}`;
          ctx.status = 405;
          ctx.body = new Response(ctx, requestDescription, reply);
        } else if (commandQueued) {
          const reply = `Command ${gcode} queued`;
          ctx.status = 200;
          ctx.body = new Response(ctx, requestDescription, reply);
        } else {
          const reply = `Command Queue is full. Please try again later`;
          ctx.status = 405;
          ctx.body = new Response(ctx, requestDescription, reply);
        }
      } else {
        throw `Gcode is undefined.`;
      }
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

const botRoutes = (self) => {
  getBot(self);
  processBotCommand(self);
  processGcode(self);
};

module.exports = botRoutes;
