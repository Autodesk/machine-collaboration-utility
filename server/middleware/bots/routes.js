/* global logger */
const Response = require('../helpers/response');
const _ = require('lodash');

/**
 * Handle all logic at this endpoint for reading all of the bots
 */
const getBots = (self) => {
  const requestDescription = 'Get Bots';
  self.router.get(`${self.routeEndpoint}/`, (ctx) => {
    try {
      const botsJson = self.getBots();
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, botsJson);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for deleting all bots
 */
const deleteAllBots = (self) => {
  const requestDescription = 'Delete All Bots';
  self.router.delete(`${self.routeEndpoint}/all/`, async (ctx) => {
    try {
      for (const uuid in self.botList) {
        if (self.botList.hasOwnProperty(uuid)) {
          try {
            await self.deleteBot(uuid);
          } catch (ex) {
            logger.error(`Delete bot ${uuid} error: ${ex}`);
          }
        }
      }
      const status = 'All bots deleted';
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, status);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      logger.error(ex);
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
      const newBot = await self.createPersistentBot(ctx.request.body);
      const reply = newBot.getBot();
      ctx.status = 201;
      ctx.body = new Response(ctx, requestDescription, reply);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for updating the bot's settings
 */
const updateBot = (self) => {
  const requestDescription = 'Update Bot Settings';
  self.router.put(`${self.routeEndpoint}/:uuid`, async (ctx) => {
    try {
      let uuid = ctx.params.uuid;
      if (uuid === undefined) {
        throw '"uuid" is not defined';
      }

      // For ease of communication with single bots using the api
      // allow the first connected bot to be address as 'solo'
      if (uuid === 'solo') {
        uuid = self.soloBot();
      }

      const bot = self.botList[uuid];
      if (bot === undefined) {
        throw `Bot ${uuid} can not be found`;
      }

      const botSettings = ctx.request.body;
      const reply = await bot.updateBot(botSettings);
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, reply);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for deleting a bot
 */
const deleteBot = (self) => {
  const requestDescription = 'Delete Bot';
  self.router.delete(`${self.routeEndpoint}/:uuid`, async (ctx) => {
    try {
      const uuid = ctx.params.uuid;
      if (uuid === undefined) {
        throw '"uuid" is undefined.';
      }

      const reply = await self.deleteBot(uuid);
      // const reply = 'Bot successfully deleted';
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, reply);
    } catch (ex) {
      logger.error(ex);
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for retreiving a specific bot
 */
const getBot = (self) => {
  const requestDescription = 'Get Bot';
  self.router.get(`${self.routeEndpoint}/:uuid`, (ctx) => {
    try {
      let uuid = ctx.params.uuid;
      if (uuid === undefined) {
        throw '"uuid" is not defined';
      }

      // For ease of communication with single bots using the api
      // allow the first connected bot to be address as 'solo'
      if (uuid === 'solo') {
        uuid = self.soloBot();
      }

      const botJson = self.getBot(uuid);
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, botJson);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for sending a command to the bot
 */
const processBotCommand = (self) => {
  const requestDescription = 'Process Bot Command';
  self.router.post(`${self.routeEndpoint}/:uuid`, async (ctx) => {
    try {
      let uuid = ctx.params.uuid;
      if (uuid === undefined) {
        throw '"uuid" is not defined';
      }

      // For ease of communication with single bots using the api
      // allow the first connected bot to be address as 'solo'
      if (uuid === 'solo') {
        uuid = self.soloBot();
      }

      const bot = self.botList[uuid];
      if (bot === undefined) {
        throw `Bot "${uuid} not found"`;
      }

      let command = ctx.request.body.command;
      if (command === undefined) {
        throw '"command" is undefined';
      }

      const params = {};
      for (const [paramKey, param] of _.entries(ctx.request.body)) {
        if (paramKey !== 'command') {
          params[paramKey] = param;
        }
      }
      const commandReply = await bot.processCommand(command, params);
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, commandReply);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      logger.error(ex);
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
};

module.exports = botRoutes;
