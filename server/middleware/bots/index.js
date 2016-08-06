const router = require(`koa-router`)();
const fs = require(`fs-promise`);
const path = require(`path`);
const _ = require(`underscore`);
const Promise = require(`bluebird`);
const bsync = require(`asyncawait/async`);
const bwait = require(`asyncawait/await`);

const botsRoutes = require(`./routes`);
const botModel = require(`./model`);
const Bot = require(`./bot`);

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

    const botsDbArray = bwait(this.BotModel.findAll());
    // Load all bots from the database and add them to the 'bots' object
    for (const dbBot of botsDbArray) {
      try {
        bwait(this.createBot(dbBot.dataValues));
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
  const botPresets = bwait(fs.readdir(path.join(__dirname, './settings/bots')));
  for (const botPresetFile of botPresets) {
    const presetType = botPresetFile.split(`.`)[0];
    const presetPath = path.join(__dirname, `./settings/bots/${botPresetFile}`);
    const BotPresetClass = require(presetPath);
    this.botPresetList[presetType] = {};
    this.botPresetList[presetType].Class = BotPresetClass;
    this.botPresetList[presetType].presets = {};
    const presetObject = new BotPresetClass(this.app);
    for (const [presetKey, preset] of _.pairs(presetObject)) {
      if (
        typeof preset !== `function` &&
        presetKey !== `app` &&
        presetKey !== `logger` &&
        presetKey !== `commands`
      ) {
        this.botPresetList[presetType].presets[presetKey] = preset;
      }
    }
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
    this.botPresetList[inputSettings.model] === undefined ||
    this.botPresetList[inputSettings.model].Class === undefined
  ) ?
  new this.botPresetList[`DefaultBot`].Class(this.app) :
  new this.botPresetList[inputSettings.model].Class(this.app);
  // Mixin all input settings into the bot object
  _.extend(botPresets.settings, inputSettings);
  const newBot = new Bot(this.app, botPresets);

  // Add the bot to the list
  this.botList[newBot.settings.uuid] = newBot;

  this.app.io.emit(`botEvent`, {
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
      delete this.botList[uuid];
      deleted = true;
    }
  }
  if (!deleted) {
    throw `Bot "${uuid}" was not deleted from the database because it cound not be found in the database.`;
  }
  this.app.io.emit(`botEvent`, {
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
  const botPresetSettings = {};
  for (const [presetKey, preset] of _.pairs(this.botPresetList)) {
    botPresetSettings[presetKey] = preset.presets;
  }
  return botPresetSettings;
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
