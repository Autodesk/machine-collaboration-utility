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
          const reply = `Command Queue error`;
          ctx.status = 500;
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

/**
 * Handle all logic at this endpoint for jogging the bot
 */
const jog = (self) => {
  const requestDescription = 'Jog Gcode';
  self.router.post(`${self.routeEndpoint}/jog`, async (ctx) => {
    try {
      const gcode = ctx.request.body.gcode;
      if (gcode) {
        const commandQueued = await self.jog(gcode);
        if (commandQueued === undefined) {
          const reply = `Cannot send gcode from state ${self.fsm.current}`;
          ctx.status = 405;
          ctx.body = new Response(ctx, requestDescription, reply);
        } else if (commandQueued) {
          const reply = `Bot jogged: ${gcode}`;
          ctx.status = 200;
          ctx.body = new Response(ctx, requestDescription, reply);
        } else {
          const reply = `Command Queue error`;
          ctx.status = 500;
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

/**
 * Handle all logic at this endpoint for sending a command to the bot
 */
const streamGcode = (self) => {
  const requestDescription = 'Process Gcode';
  self.router.post(`${self.routeEndpoint}/streamGcode`, async (ctx) => {
    try {
      const gcode = ctx.request.body.gcode;
      if (gcode) {
        const commandQueued = await self.streamGcode(gcode);
        if (commandQueued === undefined) {
          const reply = `Cannot stream gcode from state ${self.fsm.current}`;
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

/**
 * Handle all logic at this endpoint for updating the bot's settings
 */
const updateBot = (self) => {
  const requestDescription = 'Update Bot Settings';
  self.router.put(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const botSettings = ctx.request.body.bot;
      const bots = await self.Bot.findAll();
      bots[0].updateAttributes({
        jogXSpeed: botSettings.jogXSpeed,
        jogYSpeed: botSettings.jogYSpeed,
        jogZSpeed: botSettings.jogZSpeed,
        jogESpeed: botSettings.jogESpeed,
        tempE: botSettings.tempESpeed,
        tempB: botSettings.tempBSpeed,
        speedRatio: botSettings.speedRatio,
        eRatio: botSettings.eRatio,
        offsetX: botSettings.offsetX,
        offsetY: botSettings.offsetY,
        offsetZ: botSettings.offsetZ,
      });
      self.botSettings = botSettings;
      const reply = `Bot settings successfully updated`;
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, reply);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
    }
  });
};

const botRoutes = (self) => {
  getBot(self);
  processBotCommand(self);
  processGcode(self);
  jog(self);
  streamGcode(self);
  updateBot(self);
};

module.exports = botRoutes;
