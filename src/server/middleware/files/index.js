const router = require(`koa-router`)();
const path = require(`path`);
const fs = require(`fs-promise`);
const walk = require(`fs-walk`);
const uuidGenerator = require(`node-uuid`);
const winston = require(`winston`);
const _ = require(`underscore`);
const bsync = require(`asyncawait/async`);
const bwait = require(`asyncawait/await`);

const filesRoutes = require(`./routes`);

/**
 * A Files server class
 * @param {Object} app - The parent Koa app.
 * @param {string} routeEndpoint - The relative endpoint.
 */
const Files = function(app, routeEndpoint) {
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
Files.prototype.initialize = bsync(function initialize() {
  try {
    bwait(this.setupRouter());
    bwait(this.createUploadDirectory());
    bwait(this.scanUploadDirectory());
    this.logger.info(`Files instance initialized`);
  } catch (ex) {
    this.logger.error(`Files initialization error`, ex);
  }
});

/**
 * Create an upload directory where specified by Escher.uploadDir
 * unless it already exists
 */
Files.prototype.createUploadDirectory = bsync(function createUploadDirectory() {
  const directoryExists = bwait(fs.exists(this.uploadDir));
  if (!directoryExists) {
    bwait(fs.mkdir(this.uploadDir));
  }
});

/**
 * Scan the upload directory and add references to all files to an array
 */
Files.prototype.scanUploadDirectory = bsync(function scanUploadDirectory() {
  const self = this;
  walk.walkSync(self.uploadDir, bsync((basedir, filename) => {
    const uuid = filename.split('_')[filename.split('_').length - 1].split('.')[0];
    if (uuid.length !== 36) {
      return;
    }
    const fileExtension = filename.split(`.`)[1];
    if (fileExtension === undefined) {
      return;
    }
    const name = filename.split('_' + uuid)[0] + '.' + filename.split('.')[1];
    const filePath = `${basedir}/${filename}`;
    const fileStats = bwait(fs.stat(filePath));
    const dateChanged = fileStats.ctime;

    const fileObject = {
      uuid,
      name,
      dateChanged,
      conductorFile: false,
      filePath,
    };
    self.fileList[uuid] = fileObject;
  }));
});

/**
 * Set up the files' instance's router
 */
Files.prototype.setupRouter = bsync(function setupRouter() {
  try {
    // Populate this.router with all routes
    // Then register all routes with the app
    bwait(filesRoutes(this));

    // Register all router routes with the app
    this.app.use(this.router.routes()).use(this.router.allowedMethods());
    this.logger.info(`Files router setup complete`);
  } catch (ex) {
    this.logger.error(`Files router setup error`, ex);
  }
});

/**
 * Create the file object
 * Add a unique uuid or allow it to be set by the user
 * Allow the option for the user to set their own uuid for the file
 *
 * File object has a file name
 * File path
 * uuid
 *
 */
Files.prototype.createFile = bsync(function createFile(file, userPath, userUuid) {
  let fileObject;
  if (userPath === undefined) {
    const uuid = bwait(uuidGenerator.v1());
    const name = file.name;
    const fileStats = bwait(fs.stat(file.path));
    const dateChanged = fileStats.ctime;
    const conductorFile = false;
    const filePath = this.uploadDir + `/` + name.split(`.`)[0] + `_` + uuid + `.` + name.split(`.`)[1];
    fileObject = { uuid, name, dateChanged, conductorFile, filePath };

    // Rename the file from it's random name to the file's name plus the uuid
    const nameArray = name.split(`.`);
    const fileName = nameArray[0];
    const fileExt = nameArray[1];
    const filenameWithUuid = `${this.uploadDir}/${fileName}_${uuid}.${fileExt}`;
    bwait(fs.rename(file.path, filenameWithUuid));
    this.fileList[uuid] = fileObject;
    this.app.io.emit(`fileEvent`, {
      uuid,
      event: `new`,
      data: fileObject,
    });
  } else {
    if (userUuid === undefined) {
      throw `userUuid must be defined`;
    }
    const fileStats = bwait(fs.stat(userPath));
    const uuid = userUuid;
    const name = userPath.split('\\').pop().split('/').pop();
    const dateChanged = fileStats.ctime;
    const conductorFile = true;
    fileObject = { uuid, name, dateChanged, conductorFile, filePath: userPath };
    this.fileList[uuid] = fileObject;
  }

  return fileObject;
});

Files.prototype.getFiles = function getFiles() {
  const fileList = {};
  _.pairs(this.fileList).forEach(([fileKey, file]) => {
    if (!file.conductorFile) {
      fileList[fileKey] = file;
    }
  });
  return fileList;
};

Files.prototype.getFile = function getFile(fileUuid) {
  return this.fileList[fileUuid];
};

Files.prototype.deleteFile = bsync(function deleteFile(fileUuid) {
  const file = this.fileList[fileUuid];
  const fileExists = bwait(fs.exists(file.filePath));
  if (fileExists) {
    // Delete the file
    bwait(fs.unlink(file.filePath));
    this.logger.info('Just deleted file', file.filePath);
    // Remove the file object from the 'files' array
    delete this.fileList[fileUuid];
    this.app.io.emit(`fileEvent`, {
      uuid: fileUuid,
      event: `delete`,
      data: null,
    });
    return `File ${fileUuid} deleted`;
  }
  return false;
});

module.exports = Files;
