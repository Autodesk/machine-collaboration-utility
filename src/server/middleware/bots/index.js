const router = require(`koa-router`)();
const fs = require(`fs-promise`);
const path = require(`path`);

const botsRoutes = require(`./routes`);
const botModel = require(`./model`);
const Bot = require(`./bot`);

/**
 * This is a Bots class representing all of the available hardware
 *
 * The bots are discovered or registered through this class and controlled by
 * the individual Bot class API
 *
 */
class Bots {
  /**
   * A bots server class
   * @param {Object} app - The parent Koa app.
   * @param {string} routeEndpoint - The relative endpoint.
   */
  constructor(app, routeEndpoint) {
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
  }

/*******************************************************************************
 * Initialization functions
 ******************************************************************************/
  /**
   * initialize the bots endpoint
   */
  async initialize() {
    try {
      // Set up the router
      await this.loadBotPresets();
      await this.setupRouter();

      // Set up the bot database model
      this.BotModel = await botModel(this.app);
      let botsDbArray = await this.BotModel.findAll();
      // Load all bots from the database and add them to the 'bots' object
      for (const dbBot of botsDbArray) {
        this.createBot(dbBot.dataValues);
      }

      // If there are not bots saved yet, create one
      // This first bot object is where we will save settings for
      // generic usb bots that cannot be made persistent
      if (botsDbArray.length === 0) {
        await this.createBot();
      }

      // Start scanning for all bots
      await this.setupDiscovery();
      this.logger.info(`Bots instance initialized`);
    } catch (ex) {
      this.logger.error(`Bot initialization error`, ex);
    }
  }

  /**
   * Set up the bot's instance's router
   */
  async setupRouter() {
    try {
      // Populate this.router with all routes
      // Then register all routes with the app
      await botsRoutes(this);

      // Register all router routes with the app
      this.app.use(this.router.routes()).use(this.router.allowedMethods());
      this.logger.info(`Bots router setup complete`);
    } catch (ex) {
      this.logger.error(`Bots router setup error`, ex);
    }
  }

  /*
   * Scan through and initialize every discovery type
   */
  async setupDiscovery() {
    const discoveryDirectory = path.join(__dirname, `./discovery`);
    const discoveryTypes = await fs.readdir(discoveryDirectory);
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
  }

  async loadBotPresets() {
    const botPresets = await fs.readdir(path.join(__dirname, './hardware/bots'));
    botPresets.forEach((botPreset) => {
      // Scan through all of the bot presets.
      // Make sure to ignore the source map files
      // TODO refactor in case helper files are necessary in the 'hardware' folder
      if (botPreset.indexOf(`.map`) === -1) {
        const presetType = botPreset.split(`.`)[0];
        const presetPath = path.join(__dirname, `./hardware/bots/${botPreset}`);
        const BotPresetClass = require(presetPath);
        const botPresetObject = new BotPresetClass(this.app);
        this.botPresetList[presetType] = botPresetObject;
      }
    });
  }


/*******************************************************************************
 * Core functions
 ******************************************************************************/
  async createBot(inputSettings = {}) {
    debugger;

    // Load presets based on the model
    // If no model is passed, or if the model does not exist use the default presets
    const botPresets = Object.assign({}, (inputSettings.model === undefined || this.botPresetList[inputSettings.model] === undefined) ? this.botPresetList[`DefaultBot`] : this.botPresetList[inputSettings.model]);
    for (const setting in botPresets.settings) {
      if (inputSettings.hasOwnProperty(setting)) {
        botPresets.settings[setting] = inputSettings[setting];
      }
    }

    // Don't add the bot if it has a duplicate botId in the database
    if (this.botList[botPresets.settings.botId] !== undefined) {
      const errorMessage = `Cannot create bot with unique identifier "${botPresets.settings.botId}". Bot already exists`;
      throw errorMessage;
    }

    // Need to work out caveat for USB printers that don't have a pnpid
    await this.BotModel.create(botPresets.settings);
    const newBot = new Bot(this.app, botPresets);
    this.botList[this.sanitizeStringForRouting(botPresets.settings.botId)] = newBot;
    return newBot;
  }

  async deleteBot(botId) {
    const bot = this.botList[botId];
    if (bot === undefined) {
      throw `Bot "${botId}" is undefined`;
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

    // Sweep through all of the bots in the database
    // Make sure the bot is in the database. If it is, delete it
    const bots = await this.BotModel.findAll();
    let deleted = false;
    for (const dbBot of bots) {
      const dbBotId = dbBot.dataValues.botId;
      if (botId === dbBotId) {
        dbBot.destroy();
        delete this.botList[botId];
        deleted = true;
      }
    }
    if (!deleted) {
      throw `Bot "${botId}" was not deleted from the database because it cound not be found in the database.`;
    }
    return `Bot "${botId}" successfully deleted`;
  }

/*******************************************************************************
 * Utility functions
 ******************************************************************************/
  /*
   * get a json friendly description of the Bots
   */
  getBots(filter) {
    const filteredBots = {};
    for (const bot in this.botList) {
      if (this.botList.hasOwnProperty(bot)) {
        if (typeof filter === `function`) {
          if (filter(this.botList[bot])) {
            filteredBots[bot] = this.botList[bot].getBot();
          }
        } else {
          filteredBots[bot] = this.botList[bot].getBot();
        }
      }
    }
    return filteredBots;
  }

  /*
   * get a json friendly description of a Bots
   */
  getBot(botId) {
    return this.botList[botId].getBot();
  }

  // For ease of communication with single bots using the api
  // allow the first connected bot to be address as `solo`
  // return the first connected bot
  soloBot() {
    let soloBotId = undefined;
    for (const bot in this.botList) {
      if (this.botList.hasOwnProperty(bot)) {
        if (this.botList[bot].fsm.current !== `unavailable`) {
          soloBotId = bot;
          break;
        }
      }
    }
    if (soloBotId === undefined) {
      throw `No bot is currently available`;
    }
    return soloBotId;
  }

  sanitizeStringForRouting(portName) {
    // This replaces the "/" character with "_s_" and the ":" character with "_c_"
    return portName.replace(/\//g, '_s_').replace(/:/g, '_c_');
  }
}

module.exports = Bots;
