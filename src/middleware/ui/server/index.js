const router = require(`koa-router`)();
const uiRoutes = require(`./routes`);

/**
 * This is a Files class.
 */
class UI {
  /**
   * A Files server class
   * @param {Object} app - The parent Koa app.
   * @param {string} routeEndpoint - The relative endpoint.
   */
  constructor(app, routeEndpoint) {
    this.app = app;
    this.logger = app.context.logger;
    this.routeEndpoint = routeEndpoint;
    this.router = router;
  }

  /**
   * initialize the files endpoint
   */
  async initialize() {
    try {
      await this.setupRouter();
      this.logger.info(`UI instance initialized`);
    } catch (ex) {
      this.logger.error(`UI initialization error`, ex);
    }
  }

  /**
   * Set up the UI's instance's router
   */
  async setupRouter() {
    try {
      // Populate this.router with all routes
      // Then register all routes with the app
      await uiRoutes(this);

      // Register all router routes with the app
      this.app.use(this.router.routes()).use(this.router.allowedMethods());
      this.logger.info(`UI router setup complete`);
    } catch (ex) {
      this.logger.error(`UI router setup error`, ex);
    }
  }
}

module.exports = UI;
