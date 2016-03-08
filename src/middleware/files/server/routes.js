const convert = require(`koa-convert`);
const body = require(`koa-body`);
const fs = require(`fs-promise`);
const Promise = require(`bluebird`);
const send = require(`koa-send`);
const path = require(`path`);

const Response = require(`../helpers/response`);

/**
 * Handle all file upload requests for the Conductor + '/upload' endpoint
 */
const uploadFile = (self) => {
  const requestDescription = 'Upload File';
  // Populate this array with file objects for every file that is successfully uploaded
  self.router.post(
    `${self.routeEndpoint}/`,
    convert(body({ multipart: true })),
    async (ctx) => {
      let uploadedFiles = [];
      try {
        const files = ctx.request.body.files;

        if (files) {
          // Rename each file to be its filename plus a timestamp
          // Iterate through every single file in the 'files' object
          await Promise.map(
            Object.keys(files),
            async (theFile) => {
              // If multiple files are passed with the same key, they are an Array
              if (Array.isArray(files[theFile])) {
                await Promise.map(
                  files[theFile],
                  async (file) => {
                    uploadedFiles.push(await self.createFileObject(file));
                  },
                  { concurrency: 4 }
                );
              } else {
                uploadedFiles.push(await self.createFileObject(files[theFile]));
              }
            },
            { concurrency: 4 }
          );
          // Once the file is uploaded, then add it to the array of available files
          ctx.status = 201;
          ctx.body = new Response(ctx, requestDescription, uploadedFiles);

          // TODO handle passing multiple files as a socket event
          self.app.io.emit(`fileEvent`, uploadedFiles[0]);
        } else {
          const errorMessage = `No file was received.`;
          ctx.body = new Response(ctx, requestDescription, errorMessage);
          ctx.status = 404;
          self.logger.error(errorMessage);
          return;
        }
      } catch (ex) {
        ctx.status = 500;
        ctx.body = new Response(ctx, requestDescription, ex);
        self.logger.error(ex);
      }
    }
  );
};

/**
 * Handle all logic at this endpoint for deleting a file
 */
const deleteFile = (self) => {
  const requestDescription = 'Delete File';
  self.router.delete(self.routeEndpoint, async (ctx) => {
    try {
      const fileUuid = ctx.request.body.uuid;
      const file = self.files[fileUuid];
      if (fileUuid === undefined) {
        const errorMessage = `No "fileUuid" was provided`;
        ctx.status = 404;
        ctx.body = new Response(ctx, requestDescription, errorMessage);
        self.logger.error(errorMessage);
      } else if (file === undefined) {
        const errorMessage = `File ${fileUuid} not found`;
        ctx.status = 404;
        ctx.body = new Response(ctx, requestDescription, errorMessage);
        self.logger.error(errorMessage);
      } else {
        const filePath = self.getFilePath(file);
        const fileExists = await fs.exists(filePath);
        if (fileExists) {
          // Delete the file
          await fs.unlink(filePath);
          self.logger.info('Just deleted file', filePath);
          // Remove the file object from the 'files' array
          delete self.files[fileUuid];
          const response = `File ${fileUuid} deleted`;
          ctx.body = new Response(ctx, requestDescription, response);
        } else {
          const errorMessage = `File at path "${filePath}" does not exist`;
          ctx.status = 404;
          ctx.body = new Response(ctx, requestDescription, errorMessage);
        }
      }
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for reading all of the tasks
 */
const getFiles = (self) => {
  const requestDescription = 'Get Files';
  self.router.get(self.routeEndpoint + '/', async (ctx) => {
    try {
      ctx.body = new Response(ctx, requestDescription, self.files);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for reading a single task
 */
const getFile = (self) => {
  const requestDescription = 'Get File';
  self.router.get(self.routeEndpoint + `/:uuid`, async (ctx) => {
    try {
      const fileUuid = ctx.params.uuid;
      const file = self.files[fileUuid];
      if (file) {
        ctx.body = new Response(ctx, requestDescription, file);
      } else {
        const errorMessage = `File ${fileUuid} not found`;
        ctx.status = 404;
        ctx.body = new Response(ctx, requestDescription, errorMessage);
        self.logger.error(errorMessage);
      }
    } catch (ex) {
      const errorMessage = `To-do list "Read Task ${ctx.params.uuid}" request error: ${ex}`;
      ctx.body = new Response(ctx, requestDescription, errorMessage);
      ctx.status = 500;
      self.logger.error(errorMessage);
    }
  });
};

/**
 * Handle all logic at this endpoint for reading a single task
 */
const downloadFile = (self) => {
  self.router.get(self.routeEndpoint + `/:uuid/download`, async (ctx) => {
    const requestDescription = 'Download File';
    try {
      const fileUuid = ctx.params.uuid;
      const file = self.files[fileUuid];
      if (file) {
        ctx.res.setHeader(`Content-disposition`, `attachment; filename=${file.name}`);
        ctx.body = fs.createReadStream(self.getFilePath(file));
      } else {
        ctx.status = 404;
        const errorMessage = `File "${fileUuid}" not found`;
        ctx.body = new Response(ctx, requestDescription, errorMessage);
        self.logger.error(errorMessage);
      }
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

const filesRoutes = (self) => {
  uploadFile(self);
  deleteFile(self);
  getFiles(self);
  getFile(self);
  downloadFile(self);
};

module.exports = filesRoutes;
