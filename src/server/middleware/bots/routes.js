const Response = require(`../helpers/response`);
const Bot = require(`./bot`);

/**
 * Handle all logic at this endpoint for reading all of the bots
 */
const getBots = (self) => {
  const requestDescription = `Get Bots`;
  self.router.get(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const botsJson = self.getBots();
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, botsJson);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for updating the bot's
 */
const createBot = (self) => {
  const requestDescription = 'Create Bot';
  self.router.post(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const paramSettings = {};
      const model = ctx.request.body.model;

      // Overwrite the default settings with any settings passed by the request
      for (const setting in ctx.request.body) {
        if (ctx.request.body.hasOwnProperty(setting) && ctx.request.body[setting] !== `model`) {
          paramSettings[setting] = ctx.request.body[setting];
        }
      }

      const reply = await self.createBot(paramSettings, model);
      ctx.status = 201;
      ctx.body = new Response(ctx, requestDescription, reply);
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
  self.router.put(`${self.routeEndpoint}/:uniqueIdentifier`, async (ctx) => {
    try {
      const uniqueIdentifier = ctx.params.uniqueIdentifier;
      if (uniqueIdentifier) {
        const bot = self.botList[uniqueIdentifier];
        if (bot) {
          const botSettings = ctx.request.body;
          const reply = await bot.updateBot(botSettings);
          ctx.status = 200;
          ctx.body = new Response(ctx, requestDescription, reply);
        } else {
          throw `Bot "${uniqueIdentifier}" not found`;
        }
      } else {
        throw `uniqueIdentifier is undefined`;
      }
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for deleting a bot
 */
const deleteBot = (self) => {
  const requestDescription = 'Delete Bot';
  self.router.delete(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const botId = ctx.request.body.botId;

      if (botId === undefined) {
        throw `botId is undefined.`
      }
      const bot = self.botList[botId];
      if (bot === undefined) {
        throw `Bot ${botId} does not exist`;
      }
      switch (bot.connectionType) {
        case `http`:
        case `telnet`:
        case `virtual`:
          // do nothing
          break;
        default:
          const errorMessage = `Cannot delete bot of type ${bot.connectionType}`;
          throw errorMessage;
      }
      const bots = await self.BotModel.findAll();
      let destroyed = false;
      for (const dbBot of bots) {
        const dbBotId = dbBot.dataValues.id;
        if (botId === dbBotId) {
          dbBot.destroy();
          delete self.botList[botId];
          destroyed = true;
        }
      }
      if (!destroyed) {
        throw `Bot ${botId} not found in database`;
      }
      const reply = `Bot successfully deleted`;
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, reply);
    } catch (ex) {
      self.logger.error(ex);
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for retreiving a specific bot
 */
const getBot = (self) => {
  const requestDescription = `Get Bot`;
  self.router.get(`${self.routeEndpoint}/:botId`, async (ctx) => {
    try {
      let botId = ctx.params.botId;
      // For ease of communication with single bots using the api
      // allow the first connected bot to be address as `solo`
      if (botId === `solo`) {
        botId = self.soloBot();
      }

      const botJson = self.getBot(botId);
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
  self.router.post(`${self.routeEndpoint}/:botId`, async (ctx) => {
    try {
      let botId = ctx.params.botId;

      // For ease of communication with single bots using the api
      // allow the first connected bot to be address as `solo`
      if (botId === `solo`) {
        botId = self.soloBot();
      }

      const bot = self.botList[botId];
      if (botId) {
        if (bot) {
          const command = ctx.request.body.command;
          if (command) {
            const commandReply = await bot.processCommand(command);
            ctx.status = 200;
            ctx.body = new Response(ctx, requestDescription, commandReply);
          } else {
            throw `Command is undefined.`;
          }
        } else {
          throw `Bot "${botId}" not found.`;
        }
      } else {
        throw `botId is undefined`;
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
const addBotSubscriber = (self) => {
  const requestDescription = `Add Bot Subscriber`;
  self.router.post(`${self.routeEndpoint}/:botId/addSubscriber`, async (ctx) => {
    try {
      let botId = ctx.params.botId;

      // For ease of communication with single bots using the api
      // allow the first connected bot to be address as `solo`
      if (botId === `solo`) {
        botId = self.soloBot();
      }

      const bot = self.botList[botId];
      if (botId) {
        if (bot) {
          const subscriberEndpoint = ctx.request.body.subscriberEndpoint;
          if (subscriberEndpoint) {
            const addSubscriberReplay = await bot.addBotSubscriber(subscriberEndpoint);
            ctx.status = 200;
            ctx.body = new Response(ctx, requestDescription, commandReply);
          } else {
            throw `"subscriberEndpoint" is undefined.`;
          }
        } else {
          throw `Bot "${botId}" not found.`;
        }
      } else {
        throw `botId is undefined`;
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
  self.router.post(`${self.routeEndpoint}/:botId/processGcode`, async (ctx) => {
    try {
      let botId = ctx.params.botId;
      // For ease of communication with single bots using the api
      // allow the first connected bot to be address as `solo`
      if (botId === `solo`) {
        botId = self.soloBot();
      }

      if (botId) {
        const bot = self.botList[botId];
        if (bot) {
          const gcode = ctx.request.body.gcode;
          if (gcode) {
            const commandQueued = await bot.processGcode(gcode);
            if (commandQueued === undefined) {
              const reply = `Cannot send gcode from state ${bot.fsm.current}`;
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
        } else {
          throw `Bot "${botId}" not found`;
        }
      } else {
        throw `BotId is undefined`;
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
  const requestDescription = 'Stream Gcode';
  self.router.post(`${self.routeEndpoint}/:botId/streamGcode`, async (ctx) => {
    try {
      let botId = ctx.params.botId;
      // For ease of communication with single bots using the api
      // allow the first connected bot to be address as `solo`
      if (botId === `solo`) {
        botId = self.soloBot();
      }

      if (botId) {
        const bot = self.botList[botId];
        if (bot) {
          const gcode = ctx.request.body.gcode;
          if (gcode) {
            const commandQueued = await bot.streamGcode(gcode);
            if (commandQueued === undefined) {
              const reply = `Cannot send gcode from state ${bot.fsm.current}`;
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
        } else {
          throw `Bot "${botId}" not found`;
        }
      } else {
        throw `botId is undefined`;
      }
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

const botRoutes = (self) => {
  getBots(self);

  getBot(self);
  createBot(self);
  updateBot(self);
  deleteBot(self);

  processBotCommand(self);
  processGcode(self);
  streamGcode(self);
};

module.exports = botRoutes;

// module.exports = botRoutes;
