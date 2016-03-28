const router = require(`koa-router`)();
const fs = require(`fs-promise`);
const path = require(`path`);

const botsRoutes = require(`./routes`);
const botModel = require(`./model/bot`);

/**
 * This is a Bots class representing all of the available hardware
 *
 * The bots are discovered or registered through this class and controlled by
 * the individual Bot class API
 *
 */
class Bots {
  /**
   * A bot server class
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
    this.bots = {};
  }

  /**
   * initialize the bot endpoint
   */
  async initialize() {
    try {
      await this.setupRouter();
      this.Bot = await botModel(this.app);
      const botsDbArray = await this.Bot.findAll();
      for (const dbBot of botsDbArray) {
        const bot = {};
        bot.port = dbBot.dataValues.port;
        bot.name = dbBot.dataValues.name;
        bot.jogXSpeed = dbBot.dataValues.jogXSpeed;
        bot.jogYSpeed = dbBot.dataValues.jogYSpeed;
        bot.jogZSpeed = dbBot.dataValues.jogZSpeed;
        bot.jogESpeed = dbBot.dataValues.jogESpeed;
        bot.tempE = dbBot.dataValues.tempE;
        bot.tempB = dbBot.dataValues.tempB;
        bot.speedRatio = dbBot.dataValues.speedRatio;
        bot.eRatio = dbBot.dataValues.eRatio;
        bot.offsetX = dbBot.dataValues.offsetX;
        bot.offsetY = dbBot.dataValues.offsetY;
        bot.offsetZ = dbBot.dataValues.offsetZ;
        this.bots[bot.port] = bot;
      }
      await this.setupDiscovery();
      this.logger.info(`Bots instance initialized`);
    } catch (ex) {
      this.logger.error(`Bot initialization error`, ex);
    }
  }

  /*
   * get a json friendly description of the Bots
   */
  getBots() {
    return this.bots;
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
      this.logger.info(`Bot router setup complete`);
    } catch (ex) {
      this.logger.error(`Bot router setup error`, ex);
    }
  }

  async setupDiscovery() {
    const discoveryDirectory = path.join(__dirname, `./discovery`);
    const discoveryTypes = await fs.readdir(discoveryDirectory);
    discoveryTypes.forEach((discoveryType) => {
      if (discoveryType.indexOf(`.map`) === -1) {
        const discoveryPath = path.join(__dirname, `./discovery/${discoveryType}`);
        const DiscoveryClass = require(discoveryPath);
        const discoveryObject = new DiscoveryClass(this.app);
        discoveryObject.initialize();
        this.logger.info(`${discoveryType.split(`.`)[0]} discovery initialized`);
      }
    });
  }
}

module.exports = Bots;
