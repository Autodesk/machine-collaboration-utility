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
      // Overwrite the default settings with any settings passed by the request
      for (const setting in ctx.request.body) {
        if (ctx.request.body.hasOwnProperty(setting)) {
          paramSettings[setting] = ctx.request.body[setting];
        }
      }

      const botSettings = self.createBot(paramSettings);

      // Don't add the bot if it has a duplicate port in the database
      if (self.bots[botSettings.port] !== undefined) {
        const errorMessage = `Cannot create bot at port ${botSettings.port}. Bot already exists`;
        throw errorMessage;
      }

      await self.Bot.create(botSettings);
      self.bots[botSettings.port] = await new Bot(self.app, botSettings);
      const reply = `Bot created`;
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
 * Handle all logic at this endpoint for updating a bot
 */
const updateBot = (self) => {
  const requestDescription = 'Update TCP Bot Settings';
  self.router.put(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const botSettings = ctx.request.body.bot;
      // const bots = await self.Bot.findAll();
      // bots[0].updateAttributes({
      // add the stuffffff here
      // });
      // self.botSettings = botSettings;
      const reply = `TCP Bot settings successfully updated`;
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, reply);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for deleting a bot
 */
const deleteBot = (self) => {
  const requestDescription = 'Update TCP Bot Settings';
  self.router.delete(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      // find bot identifier
      // const bot = await self.Bot.findByID(asdfadsf);
      // delete it from the database
      // then remove it from the bots object
      const reply = `TCP Bot successfully deleted`;
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, reply);
    } catch (ex) {
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
  self.router.get(`${self.routeEndpoint}/:port`, async (ctx) => {
    try {
      const port = ctx.params.port;
      const botJson = self.getBot(port);
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
  self.router.post(`${self.routeEndpoint}/:port`, async (ctx) => {
    try {
      const port = ctx.params.port;
      const bot = self.bots[port];
      if (port) {
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
          throw `Bot "${port}" not found.`;
        }
      } else {
        throw `Port is undefined`;
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
  self.router.post(`${self.routeEndpoint}/:port/processGcode`, async (ctx) => {
    try {
      const port = ctx.params.port;
      if (port) {
        const bot = self.bots[port];
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
          throw `Bot "${port}" not found`;
        }
      } else {
        throw `Port is undefined`;
      }
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

// /**
//  * Handle all logic at this endpoint for jogging the bot
//  */
// const jog = (self) => {
//   const requestDescription = 'Jog Gcode';
//   self.router.post(`${self.routeEndpoint}/jog`, async (ctx) => {
//     try {
//       const gcode = ctx.request.body.gcode;
//       if (gcode) {
//         const commandQueued = await self.jog(gcode);
//         if (commandQueued === undefined) {
//           const reply = `Cannot send gcode from state ${self.fsm.current}`;
//           ctx.status = 405;
//           ctx.body = new Response(ctx, requestDescription, reply);
//         } else if (commandQueued) {
//           const reply = `Bot jogged: ${gcode}`;
//           ctx.status = 200;
//           ctx.body = new Response(ctx, requestDescription, reply);
//         } else {
//           const reply = `Command Queue error`;
//           ctx.status = 500;
//           ctx.body = new Response(ctx, requestDescription, reply);
//         }
//       } else {
//         throw `Gcode is undefined.`;
//       }
//     } catch (ex) {
//       ctx.status = 500;
//       ctx.body = new Response(ctx, requestDescription, ex);
//       self.logger.error(ex);
//     }
//   });
// };
//
// /**
//  * Handle all logic at this endpoint for sending a command to the bot
//  */
// const streamGcode = (self) => {
//   const requestDescription = 'Process Gcode';
//   self.router.post(`${self.routeEndpoint}/streamGcode`, async (ctx) => {
//     try {
//       const gcode = ctx.request.body.gcode;
//       if (gcode) {
//         const commandQueued = await self.streamGcode(gcode);
//         if (commandQueued === undefined) {
//           const reply = `Cannot stream gcode from state ${self.fsm.current}`;
//           ctx.status = 405;
//           ctx.body = new Response(ctx, requestDescription, reply);
//         } else if (commandQueued) {
//           const reply = `Command ${gcode} queued`;
//           ctx.status = 200;
//           ctx.body = new Response(ctx, requestDescription, reply);
//         } else {
//           const reply = `Command Queue is full. Please try again later`;
//           ctx.status = 405;
//           ctx.body = new Response(ctx, requestDescription, reply);
//         }
//       } else {
//         throw `Gcode is undefined.`;
//       }
//     } catch (ex) {
//       ctx.status = 500;
//       ctx.body = new Response(ctx, requestDescription, ex);
//       self.logger.error(ex);
//     }
//   });
// };
//
// /**
//  * Handle all logic at this endpoint for updating the bot's settings
//  */
// const updateBot = (self) => {
//   const requestDescription = 'Update Bot Settings';
//   self.router.put(`${self.routeEndpoint}/`, async (ctx) => {
//     try {
//       const botSettings = ctx.request.body.bot;
//       const bots = await self.Bot.findAll();
//       bots[0].updateAttributes({
//         jogXSpeed: botSettings.jogXSpeed,
//         jogYSpeed: botSettings.jogYSpeed,
//         jogZSpeed: botSettings.jogZSpeed,
//         jogESpeed: botSettings.jogESpeed,
//         tempE: botSettings.tempE,
//         tempB: botSettings.tempB,
//         speedRatio: botSettings.speedRatio,
//         eRatio: botSettings.eRatio,
//         offsetX: botSettings.offsetX,
//         offsetY: botSettings.offsetY,
//         offsetZ: botSettings.offsetZ,
//       });
//       self.botSettings = botSettings;
//       const reply = `Bot settings successfully updated`;
//       ctx.status = 200;
//       ctx.body = new Response(ctx, requestDescription, reply);
//     } catch (ex) {
//       ctx.status = 500;
//       ctx.body = new Response(ctx, requestDescription, ex);
//     }
//   });
// };
//
// const botRoutes = (self) => {
//   getBot(self);
//   processBotCommand(self);
//   processGcode(self);
//   jog(self);
//   streamGcode(self);
//   updateBot(self);
// };

const botRoutes = (self) => {
  getBots(self);
  createBot(self);
  updateBot(self);
  deleteBot(self);

  getBot(self);
  processBotCommand(self);
  processGcode(self);
};

module.exports = botRoutes;

// module.exports = botRoutes;
