const router = require(`koa-router`)();

const toDoListRoutes = require(`./routes`);
const task = require(`./model/task`);

/**
 * This is a ToDoList class.
 */
class ToDoList {
  /**
   * this is ToDoList constructor description.
   * @param {Object} app - The parent Koa app.
   * @param {string} routeEndpoint - The relative endpoint.
   * @example
   * let myToDoList = new ToDoList(app, '/toDoList');
   */
  constructor(app, routeEndpoint) {
    this.app = app;
    this.logger = app.context.logger;
    this.routeEndpoint = routeEndpoint;
    this.router = router;
  }

  /**
   * initialize the to-do list endpoint
   * @return {boolean} success
   */
  async initialize() {
    try {
      await this.setupRouter();
      // initial setup of the db
      this.Task = await task(this.app);
      this.logger.info(`To-do list instance initialized`);
      return true;
    } catch (ex) {
      this.logger.error(`To-do list initialization error`, ex);
      return false;
    }
  }

  /**
   * setupRouter sets up the to-do list instance's router
   * @returns {boolean} success
   */
  async setupRouter() {
    try {
      toDoListRoutes(this);
      // Register all router routes with the app
      this.app
      .use(this.router.routes())
      .use(this.router.allowedMethods());

      this.logger.info(`To-do list router setup`);
      return true;
    } catch (ex) {
      this.logger.error(`To-do list router setup error`, ex);
      return false;
    }
  }
}

module.exports = ToDoList;
