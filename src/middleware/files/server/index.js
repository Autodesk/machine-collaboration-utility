const router = require(`koa-router`)();
const path = require(`path`);
const fs = require(`fs-promise`);
const walk = require(`fs-walk`);

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
      const timestamp = filename.split('_')[filename.split('_').length - 1].split('.')[0];
      const filenameWithoutTimestamp = filename.split('_')[0] + '.' + filename.split('.')[1];
      const fileObject = {
        id: timestamp,
        filename: filenameWithoutTimestamp,
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
   * Add a UTC timestamp to the uploaded file
   */
  async createFileObject(file) {
    const timestamp = String(new Date().getTime());
    const filename = file.name;
    const fileObject = {
      id: timestamp,
      filename,
    };
    const filenameWithTimestamp = this.uploadDir + `/` + filename.split(`.`)[0] + `_` + timestamp + `.` + filename.split(`.`)[1];
    await fs.rename(file.path, filenameWithTimestamp);
    this.files.push(fileObject);
  }

  getFilepath(fileObject) {
    return this.uploadDir + `/` + fileObject.filename.split(`.`)[0] + `_` + fileObject.id + `.` + fileObject.filename.split(`.`)[1];
  }
}

module.exports = Files;
