/* global logger */
const convert = require('koa-convert');
const body = require('koa-body');
const fs = require('fs-promise');
const bluebird = require('bluebird');

const Response = require('../helpers/response');

/**
 * uploadFile()
 *
 * Handle all file upload requests for the Conductor + '/upload' endpoint
 *
 * @param {Object} self - The "Files" app context
 *
 */
const uploadFile = (self) => {
  const requestDescription = 'Upload File';
  // Populate this array with file objects for every file that is successfully uploaded
  self.router.post(
    `${self.routeEndpoint}/`,
    convert(body({ multipart: true, formidable: { uploadDir: self.uploadDir } })),
    async (ctx) => {
      const uploadedFiles = [];
      try {
        const files = ctx.request.body.files;
        if (files === undefined) {
          const errorMessage = 'No file was received.';
          throw errorMessage;
        }
        // Rename each file to be its filename plus a uuid
        // Iterate through every single file in the 'files' object
        await bluebird.map(
          Object.keys(files),
          async (theFile) => {
            // If multiple files are passed with the same key, they are an Array
            if (Array.isArray(files[theFile])) {
              await bluebird.map(
                files[theFile],
                async (file) => {
                  uploadedFiles.push(await self.createFile(file));
                },
                { concurrency: 5 }
              );
            } else {
              uploadedFiles.push(await self.createFile(files[theFile]));
            }
          },
          { concurrency: 5 }
        );
        ctx.status = 200;
        ctx.body = new Response(ctx, requestDescription, uploadedFiles);
      } catch (ex) {
        ctx.status = 500;
        ctx.body = new Response(ctx, requestDescription, ex);
        logger.error(ex);
      }
    }
  );
};

/**
 * deleteFile()
 *
 * Handle all logic at this endpoint for deleting a file
 *
 * @param {Object} self - The "Files" app context
 *
 */
const deleteFile = (self) => {
  const requestDescription = 'Delete File';
  self.router.delete(self.routeEndpoint, async (ctx) => {
    try {
      const fileUuid = ctx.request.body.uuid;
      if (fileUuid === undefined) {
        const errorMessage = '"uuid" of file is not provided';
        throw errorMessage;
      }
      const reply = await self.deleteFile(fileUuid);
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, reply);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      logger.error(ex);
    }
  });
};

/**
 * getFiles()
 *
 * Handle all logic at this endpoint for retrieving all of the files
 *
 * @param {Object} self - The "Files" app context
 *
 */
const getFiles = (self) => {
  const requestDescription = 'Get Files';
  self.router.get(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, self.fileList);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      logger.error(ex);
    }
  });
};

/**
 * getFile()
 *
 * Handle all logic at this endpoint for retrieving a single file
 *
 * @param {Object} self - The "Files" app context
 *
 */
const getFile = (self) => {
  const requestDescription = 'Get File';
  self.router.get(`${self.routeEndpoint}/:uuid`, async (ctx) => {
    try {
      // Parse the file's uuid
      const fileUuid = ctx.params.uuid;
      if (fileUuid === undefined) {
        const errorMessage = 'uuid of file is not defined';
        throw errorMessage;
      }
      // Load the file from the list of files
      const file = self.fileList[fileUuid];
      if (file === undefined) {
        const errorMessage = `File ${fileUuid} not found`;
        throw errorMessage;
      }
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, file);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      logger.error(ex);
    }
  });
};

/**
 * downloadFile()
 *
 * Handle all logic at this endpoint for downloading a single file
 *
 * @param {Object} self - The "Files" app context
 *
 */
const downloadFile = (self) => {
  self.router.get(`${self.routeEndpoint}/:uuid/download`, async (ctx) => {
    const requestDescription = 'Download File';
    try {
      // Parse the file's uuid
      const fileUuid = ctx.params.uuid;
      if (fileUuid === undefined) {
        const errorMessage = 'uuid of file is not defined';
        throw errorMessage;
      }
      // Load the file from the list of files
      const file = self.fileList[fileUuid];
      if (file === undefined) {
        const errorMessage = `File ${fileUuid} not found`;
        throw errorMessage;
      }
      const fileName = file.name;
      ctx.res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
      ctx.body = fs.createReadStream(file.filePath);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      logger.error(ex);
    }
  });
};

/**
 * deleteAllFiles()
 *
 * Handle all logic at this endpoint for deleting all files
 *
 * @param {Object} self - The "Files" app context
 *
 */
const deleteAllFiles = (self) => {
  const requestDescription = 'Delete All Files';
  self.router.delete(`${self.routeEndpoint}/all/`, async (ctx) => {
    try {
      for (const file in self.fileList) {
        if (self.fileList.hasOwnProperty(file)) {
          await self.deleteFile(self.fileList[file].uuid);
        }
      }
      const status = 'All files deleted';
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, status);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      logger.error(ex);
    }
  });
};

const filesRoutes = (self) => {
  uploadFile(self);
  deleteFile(self);
  getFiles(self);
  getFile(self);
  downloadFile(self);
  deleteAllFiles(self);
};

module.exports = filesRoutes;
