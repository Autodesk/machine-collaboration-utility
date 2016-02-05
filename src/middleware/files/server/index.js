const router = require(`koa-router`)();
const path = require(`path`);
const fs = require(`fs-promise`);
const walk = require(`fs-walk`);
const uuid = require(`node-uuid`);

const filesRoutes = require(`./routes`);

/**
 * This is a Files class.
 */
class Files {
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
    this.uploadDir = path.join(__dirname, `./uploads`);
    this.files = [];
  }

  /**
   * initialize the files endpoint
   */
  async initialize() {
    try {
      await this.setupRouter();
      await this.createUploadDirectory();
      await this.scanUploadDirectory();
      this.logger.info(`Files instance initialized`);
    } catch (ex) {
      this.logger.error(`Files initialization error`, ex);
    }
  }

  /**
   * Create an upload directory where specified by Escher.uploadDir
   * unless it already exists
   */
  async createUploadDirectory() {
    const directoryExists = await fs.exists(this.uploadDir);
    if (!directoryExists) {
      await fs.mkdir(this.uploadDir);
    }
  }

  /**
   * Scan the upload directory and add references to all files to an array
   */
  async scanUploadDirectory() {
    walk.walkSync(this.uploadDir, (basedir, filename) => {
      const id = filename.split('_')[filename.split('_').length - 1].split('.')[0];
      const name = filename.split('_')[0] + '.' + filename.split('.')[1];
      const fileObject = {
        id,
        name,
      };
      this.files.push(fileObject);
    });
  }

  /**
   * Set up the files' instance's router
   */
  async setupRouter() {
    try {
      // Populate this.router with all routes
      // Then register all routes with the app
      await filesRoutes(this);

      // Register all router routes with the app
      this.app.use(this.router.routes()).use(this.router.allowedMethods());
      this.logger.info(`Files router setup complete`);
    } catch (ex) {
      this.logger.error(`Files router setup error`, ex);
    }
  }

  /**
   * Create the file object
   * Allow the option for the user to set their own uuid for the file
   */
  async createFileObject(file, userUuid) {
    const id = userUuid ? userUuid : await uuid.v1();
    const name = file.name;
    const fileObject = { id, name };
    const filenameWithUuid = this.uploadDir + `/` + name.split(`.`)[0] + `_` + id + `.` + name.split(`.`)[1];
    await fs.rename(file.path, filenameWithUuid);
    this.files.push(fileObject);
    return fileObject;
  }

  getFilepath(fileObject) {
    return this.uploadDir + `/` + fileObject.name.split(`.`)[0] + `_` + fileObject.id + `.` + fileObject.name.split(`.`)[1];
  }
}

module.exports = Files;
