const router = require(`koa-router`)();
const Promise = require(`bluebird`);
const fs = require(`fs-promise`);
const path = require(`path`);

const config = require(`../../config`);
const botsRoutes = require(`./routes`);
const botModel = require(`./model/bot`);
const UsbDiscovery = require(`./discovery/usb`);

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
    app.context.bots = this; // External app reference variable
    this.app = app;
    this.logger = app.context.logger;
    this.routeEndpoint = routeEndpoint;
    this.router = router;
  }

  /**
   * initialize the bot endpoint
   */
  async initialize() {
    try {
      await this.setupRouter();
      this.Bot = await botModel(this.app);
      let botsDbObject = await this.Bot.findAll();
      // this.bots = sanitized json object
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
