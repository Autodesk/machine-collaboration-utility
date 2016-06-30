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
      const newBot = await self.createBot(ctx.request.body);
      const reply = newBot.getBot();
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
  self.router.put(`${self.routeEndpoint}/:botId`, async (ctx) => {
    try {
      const botId = ctx.params.botId;
      if (botId === undefined) {
        throw `botId is undefined`;
      }

      const bot = self.botList[botId];
      if (bot === undefined) {
        throw `Bot ${botId} can not be found`;
      }

      const botSettings = ctx.request.body;
      const reply = await bot.updateBot(botSettings);
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

      const reply = await self.deleteBot(botId);
      // const reply = `Bot successfully deleted`;
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
            const addSubscriberReply = await bot.addBotSubscriber(subscriberEndpoint);
            ctx.status = 200;
            ctx.body = new Response(ctx, requestDescription, addSubscriberReply);
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
              throw `Command Queue is full`;
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

/**
 * Handle all logic at this endpoint for deleting all bots
 */
const deleteAllBots = (self) => {
  const requestDescription = `Delete All Bots`;
  self.router.delete(`${self.routeEndpoint}/all/`, async (ctx) => {
    try {
      for (const botId in self.botList) {
        if (self.botList.hasOwnProperty(botId)) {
          try {
            await self.deleteBot(botId);
          } catch (ex) {
            self.logger.error(`Delete bot ${botId} error: ${ex}`);
          }
        }
      }
      const status = `All bots deleted`;
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, status);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

const botRoutes = (self) => {
  getBots(self);
  deleteAllBots(self);

  getBot(self);
  createBot(self);
  updateBot(self);
  deleteBot(self);

  processBotCommand(self);
  processGcode(self);
  streamGcode(self);
  addBotSubscriber(self);
};

module.exports = botRoutes;
