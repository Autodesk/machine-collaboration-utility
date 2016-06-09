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

    // Initialize list of bots to be an empty object
    this.botPresetList = {};
    this.botList = {};
  }

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

      // If there are not bots saved yet, create one
      // This first bot object is where we will save settings for
      // generic usb bots that cannot be made persistent
      if (botsDbArray.length === 0) {
        await this.BotModel.create(this.botPresetList[`DefaultBot`].settings);
        // reload the botDbArray now that we have one
        botsDbArray = await this.BotModel.findAll();
      }

      // Load all bots from the database and add them to the 'bots' object
      for (const dbBot of botsDbArray) {
        this.addDbBot(dbBot);
      }

      // Start scanning for all bots
      await this.setupDiscovery();
      this.logger.info(`Bots instance initialized`);
    } catch (ex) {
      this.logger.error(`Bot initialization error`, ex);
    }
  }

  /*
   * Read a database bot object. Create a bot object from the database object
   * Then add the bot object to the 'bots' dictionary
   */
  addDbBot(dbBot) {
    const botSettings = this.parseDbBotSettings(dbBot);

    // Create a bot object
    // The first bot object created will always be the serial port bot
    const botKey = dbBot.dataValues.uniqueIdentifier;
    const botObject = new Bot(this.app, botSettings);
    switch (botObject.connectionType) {
      case `http`:
      case `telnet`:
        botObject.setPort(botObject.settings.uniqueIdentifier);
        break;
      default:
        // do nothing
    }
    this.botList[botKey] = botObject;
  }

  /*
   * Read a database bot object. Create a bot object from the database object
   * Then add the bot object to the 'bots' dictionary
   */
  parseDbBotSettings(dbBot) {
    const botSettings = {};
    botSettings.model = dbBot.dataValues.model;
    botSettings.name = dbBot.dataValues.name;
    botSettings.uniqueIdentifier = dbBot.dataValues.uniqueIdentifier;
    botSettings.jogXSpeed = dbBot.dataValues.jogXSpeed;
    botSettings.jogYSpeed = dbBot.dataValues.jogYSpeed;
    botSettings.jogZSpeed = dbBot.dataValues.jogZSpeed;
    botSettings.jogESpeed = dbBot.dataValues.jogESpeed;
    botSettings.tempE = dbBot.dataValues.tempE;
    botSettings.tempB = dbBot.dataValues.tempB;
    botSettings.speedRatio = dbBot.dataValues.speedRatio;
    botSettings.eRatio = dbBot.dataValues.eRatio;
    botSettings.offsetX = dbBot.dataValues.offsetX;
    botSettings.offsetY = dbBot.dataValues.offsetY;
    botSettings.offsetZ = dbBot.dataValues.offsetZ;
    return botSettings;
  }

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

  async createBot(inputSettings, model) {
    const botSettings = {};
    const botPresets = model === undefined ? this.botPresetList[`DefaultBot`] : this.botPresetList[model];
    for (const setting in botPresets.settings) {
      botSettings[setting] = botPresets[setting];
      if (inputSettings.hasOwnProperty(setting)) {
        botSettings[setting] = inputSettings[setting];
      }
    }

    // Don't add the bot if it has a duplicate unique identifier in the database
    if (this.botList[botSettings.uniqueIdentifier] !== undefined) {
      const errorMessage = `Cannot create bot with unique identifier ${botSettings.uniqueIdentifier}. Bot already exists`;
      throw errorMessage;
    }

    const dbBot = await this.BotModel.create(botSettings);
    const botKey = this.sanitizeStringForRouting(dbBot.dataValues.uniqueIdentifier);

    this.botList[botKey] = await new Bot(this.app, botSettings);
    return botSettings;
  }

  /*
   * get a json friendly description of a specific bot
   */
  getBot(id) {
    const bot = this.botList[id];
    if (bot === undefined) {
      const errorMessage = `Bot with id '${id}' does not exist`;
      this.logger.error(errorMessage);
      throw errorMessage;
    }
    const botJson = bot.getBot();
    return botJson;
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

  sanitizeStringForRouting(portName) {
    return portName.replace(/\//g, '_s_').replace(/:/g, '_c_');
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
}

module.exports = Bots;
