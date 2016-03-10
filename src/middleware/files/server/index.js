const router = require(`koa-router`)();
const path = require(`path`);
const fs = require(`fs-promise`);
const walk = require(`fs-walk`);
const uuidGenerator = require(`node-uuid`);

const filesRoutes = require(`./routes`);
const Response = require(`../helpers/response`);

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
    app.context.files = this; // External app reference variable

    this.app = app;
    this.logger = app.context.logger;
    this.routeEndpoint = routeEndpoint;
    this.router = router;
    this.uploadDir = path.join(__dirname, `./uploads`);
    this.files = {};
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
    const self = this;
    walk.walkSync(self.uploadDir, async(basedir, filename) => {
      const uuid = filename.split('_')[filename.split('_').length - 1].split('.')[0];
      const name = filename.split('_' + uuid)[0] + '.' + filename.split('.')[1];
      const fileStats = await fs.stat(`${basedir}/${filename}`);
      const dateModified = new Date().getTime(fileStats.mtime);
      // TODO change date modified to date created
      const fileObject = {
        uuid,
        name,
        dateModified,
      };
      self.files[uuid] = fileObject;
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
   * Add a unique uuid or allow it to be set by the user
   * Allow the option for the user to set their own uuid for the file
   */
  async createFileObject(file, userUuid) {
    const uuid = userUuid ? userUuid : await uuidGenerator.v1();
    const name = file.name;
    const fileStats = await fs.stat(file.path);
    const dateModified = new Date().getTime(fileStats.mtime);
    const fileObject = { uuid, name, dateModified };

    // Rename the file from it's random name to the file's name plus the uuid
    const filenameWithUuid = this.uploadDir + `/` + name.split(`.`)[0] + `_` + uuid + `.` + name.split(`.`)[1];
    await fs.rename(file.path, filenameWithUuid);
    this.files[uuid] = fileObject;
    return fileObject;
  }

  getFilePath(fileObject) {
    return this.uploadDir + `/` + fileObject.name.split(`.`)[0] + `_` + fileObject.uuid + `.` + fileObject.name.split(`.`)[1];
  }

  getFile(fileUuid) {
    return this.files[fileUuid];
  }

  async deleteFile(fileUuid) {
    const file = this.files[fileUuid];
    const filePath = this.getFilePath(file);
    const fileExists = await fs.exists(filePath);
    if (fileExists) {
      // Delete the file
      await fs.unlink(filePath);
      this.app.io.emit('deleteFile', file);
      this.logger.info('Just deleted file', filePath);
      // Remove the file object from the 'files' array
      delete this.files[fileUuid];
      return `File ${fileUuid} deleted`;
    }
    return false;
  }
}

module.exports = Files;
