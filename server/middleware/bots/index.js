const router = require('koa-router')();
const fs = require('fs-promise');
const path = require('path');
const _ = require('underscore');
const Promise = require('bluebird');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');

const botsRoutes = require('./routes');
const botModel = require('./model');
const Bot = require('./bot');

/**
 * This is a Bots class representing all of the available hardware
 *
 * The bots are discovered or registered through this class and controlled by
 * the individual Bot class API
 *
 * @param {Object} app - The parent Koa app.
 * @param {string} routeEndpoint - The relative endpoint.
 */
const Bots = function Bots(app, routeEndpoint) {
  // Setup internal and external app references
  app.context.bots = this;
  this.app = app;

  // Setup logger and router
  this.logger = app.context.logger;
  this.routeEndpoint = routeEndpoint;
  this.router = router;

  // Initialize list of bots and bot presets to be empty objects
  this.botPresetList = {};
  this.botSettingList = {};
  this.botList = {};
};

/*******************************************************************************
 * Initialization functions
 ******************************************************************************/
/**
 * initialize the bots endpoint
 */
Bots.prototype.initialize = bsync(function initialize() {
  try {
    // Set up the router
    bwait(this.loadBotPresets());
    bwait(this.setupRouter());
    // Set up the bot database model
    this.BotModel = bwait(botModel(this.app));

    let botsDbArray;
    try {
      botsDbArray = bwait(this.BotModel.findAll());
    } catch (ex) {
      // In case of first boot, or schema changing, sync the database
      // WARNING this will drop all entries from the table
      bwait(this.app.context.db.sync({ force: true }));
      botsDbArray = bwait(this.BotModel.findAll());
    }
    // Load all bots from the database and add them to the 'bots' object
    for (const dbBot of botsDbArray) {
      try {
        // In case the middleware instance is only for Conducting or Serial,
        // Don't or Do, respectively, add Serial printers
        if (process.env.ONLY_CONDUCT === 'true') {
          if (dbBot.dataValues.model.indexOf('Serial') === -1) {
            bwait(this.createBot(dbBot.dataValues));
          }
        } else if (process.env.ONLY_SERIAL === 'true') {
          if (dbBot.dataValues.model.indexOf('Serial') !== -1) {
            bwait(this.createBot(dbBot.dataValues));
          }
        } else {
          bwait(this.createBot(dbBot.dataValues));
        }
      } catch (ex) {
        this.logger.error(`Failed to create bot. ${ex}`);
      }
    }

    // Start scanning for all bots
    Promise.delay(1000).then(() => {
      this.setupDiscovery();
    });

    this.logger.info(`Bots instance initialized`);
  } catch (ex) {
    this.logger.error(`Bot initialization error`, ex);
  }
});

/**
 * Set up the bot's instance's router
 */
Bots.prototype.setupRouter = bsync(function setupRouter() {
  try {
    // Populate this.router with all routes
    // Then register all routes with the app
    bwait(botsRoutes(this));
    // Register all router routes with the app
    this.app.use(this.router.routes()).use(this.router.allowedMethods());
    this.logger.info(`Bots router setup complete`);
  } catch (ex) {
    this.logger.error(`Bots router setup error`, ex);
  }
});

/*
 * Scan through and initialize every discovery type
 */
Bots.prototype.setupDiscovery = bsync(function setupDiscovery() {
  const discoveryDirectory = path.join(__dirname, `./discovery`);
  const discoveryTypes = bwait(fs.readdir(discoveryDirectory));
  discoveryTypes.forEach((discoveryFile) => {
    // Scan through all of the discovery types.
    // Make sure to ignore the source map files
    // TODO refactor in case helper files are necessary in the 'discovery' folder
    if (discoveryFile.indexOf(`.map`) === -1) {
      const discoveryType = discoveryFile.split(`.`)[0];
      const discoveryPath = path.join(__dirname, `./discovery/${discoveryFile}`);
      const DiscoveryClass = require(discoveryPath);
      const discoveryObject = new DiscoveryClass(this.app);
      discoveryObject.initialize();
      this.logger.info(`${discoveryType} discovery initialized`);
    }
  });
});

Bots.prototype.loadBotPresets = bsync(function loadBotPresets() {
  const botsPresetsPath = path.join(__dirname, `../../../bots`);
  const botPresets = bwait(fs.readdir(botsPresetsPath));
  for (const botPresetFile of botPresets) {
    const presetType = botPresetFile.split(`.`)[0];
    const presetPath = `${botsPresetsPath}/${botPresetFile}`;
    const BotPresetClass = require(presetPath);
    this.botPresetList[presetType] = BotPresetClass;
    this.botSettingList[presetType] = new BotPresetClass(this.app);
  }
  this.logger.info('done loading presets');
});


/*******************************************************************************
* Core functions
******************************************************************************/
Bots.prototype.createPersistentBot = bsync(function createPersistentBot(inputSettings = {}) {
  const newBot = bwait(this.createBot(inputSettings));
  // Need to work out caveat for USB printers that don't have a pnpid
  bwait(this.BotModel.create(newBot.settings));
  return newBot;
});

Bots.prototype.createBot = function createBot(inputSettings = {}) {
  // Load presets based on the model
  // If no model is passed, or if the model does not exist use the default presets
  const botPresets = (
    inputSettings.model === undefined ||
    this.botPresetList[inputSettings.model] === undefined
  ) ?
  this.botPresetList[`DefaultBot`] :
  this.botPresetList[inputSettings.model];
  // Mixin all input settings into the bot object
  const newBot = new Bot(this.app, botPresets, inputSettings);
  newBot.commands.initialize(newBot);

  // Add the bot to the list
  this.botList[newBot.settings.uuid] = newBot;

  this.app.io.broadcast(`botEvent`, {
    uuid: newBot.settings.uuid,
    event: `new`,
    data: newBot.getBot(),
  });
  return newBot;
};

Bots.prototype.deleteBot = bsync(function deleteBot(uuid) {
  const bot = this.botList[uuid];
  if (bot === undefined) {
    throw `Bot "${uuid}" is undefined`;
  }

  // Sweep through all of the bots in the database
  // Make sure the bot is in the database. If it is, delete it
  const bots = bwait(this.BotModel.findAll());
  let deleted = false;
  for (const dbBot of bots) {
    const dbBotUuid = dbBot.dataValues.uuid;
    if (uuid === dbBotUuid) {
      bwait(dbBot.destroy());
      this.botList[uuid].commands.toggleUpdater(this.botList[uuid], { update: false });
      delete this.botList[uuid];
      deleted = true;
    }
  }
  if (!deleted) {
    throw `Bot "${uuid}" was not deleted from the database because it cound not be found in the database.`;
  }
  this.app.io.broadcast(`botEvent`, {
    uuid,
    event: `delete`,
    data: null,
  });
  return `Bot "${uuid}" successfully deleted`;
});

/*******************************************************************************
* Utility functions
******************************************************************************/
/*
 * get a json friendly description of the Bots
 */
Bots.prototype.getBots = function getBots() {
  const filteredBots = {};
  for (const [botKey, bot] of _.pairs(this.botList)) {
    filteredBots[botKey] = bot.getBot();
  }
  return filteredBots;
};

/*
 * get a json friendly description of a Bots
 */
Bots.prototype.getBot = function(uuid) {
  return this.botList[uuid].getBot();
};

Bots.prototype.getBotPresets = function() {
  return this.botSettingList;
};

Bots.prototype.findBotByName = function(name) {
  let botByName = undefined;
  for (const [botKey, bot] of _.pairs(this.botList)) {
    if (bot.settings.name === name) {
      botByName = bot;
      break;
    }
  }
  return botByName;
};

// For ease of communication with single bots using the api
// allow the first connected bot to be address as `solo`
// return the first connected bot
Bots.prototype.soloBot = function() {
  let uuid = undefined;
  for (const [botKey, bot] of _.pairs(this.botList)) {
    if (bot.fsm.current !== `unavailable`) {
      uuid = bot.settings.uuid;
      break;
    }
  }
  if (uuid === undefined) {
    throw `No bot is currently available`;
  }
  return uuid;
};

module.exports = Bots;
