const router = require(`koa-router`)();
const path = require(`path`);
const fs = require(`fs-promise`);
const walk = require(`fs-walk`);
const uuidGenerator = require(`node-uuid`);
const winston = require(`winston`);

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
    app.context.files = this; // External app reference variable

    this.app = app;
    this.logger = app.context.logger;
    this.routeEndpoint = routeEndpoint;
    this.router = router;
    this.uploadDir = path.join(__dirname, `./uploads`);
    this.fileList = {};
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
    walk.walkSync(self.uploadDir, async (basedir, filename) => {
      const uuid = filename.split('_')[filename.split('_').length - 1].split('.')[0];
      const name = filename.split('_' + uuid)[0] + '.' + filename.split('.')[1];
      const fileStats = await fs.stat(`${basedir}/${filename}`);
      const dateChanged = fileStats.ctime;
      const fileObject = {
        uuid,
        name,
        dateChanged,
      };
      self.fileList[uuid] = fileObject;
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
    const dateChanged = fileStats.ctime;
    const fileObject = { uuid, name, dateChanged };

    // Rename the file from it's random name to the file's name plus the uuid
    const filenameWithUuid = this.uploadDir + `/` + name.split(`.`)[0] + `_` + uuid + `.` + name.split(`.`)[1];
    await fs.rename(file.path, filenameWithUuid);
    this.fileList[uuid] = fileObject;
    // this.logger.info(`filesUpdated`, this.fileList);
    this.app.io.emit(`updateFiles`, this.fileList);
    return fileObject;
  }

  getFilePath(fileObject) {
    return this.uploadDir + `/` + fileObject.name.split(`.`)[0] + `_` + fileObject.uuid + `.` + fileObject.name.split(`.`)[1];
  }

  getFiles() {
    return this.fileList;
  }

  getFile(fileUuid) {
    return this.fileList[fileUuid];
  }

  async deleteFile(fileUuid) {
    const file = this.fileList[fileUuid];
    const filePath = this.getFilePath(file);
    const fileExists = await fs.exists(filePath);
    if (fileExists) {
      // Delete the file
      await fs.unlink(filePath);
      this.logger.info('Just deleted file', filePath);
      // this.app.io.emit('deleteFile', file);
      // Remove the file object from the 'files' array
      delete this.fileList[fileUuid];
      this.app.io.emit(`updateFiles`, this.fileList);
      return `File ${fileUuid} deleted`;
    }
    return false;
  }
}

module.exports = Files;
