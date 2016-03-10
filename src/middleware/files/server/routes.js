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
          ctx.status = 200;
          ctx.body = new Response(ctx, requestDescription, uploadedFiles);

          // TODO handle passing multiple files as a socket event
          self.app.io.emit(`fileEvent`, uploadedFiles[0]);
        } else {
          const errorMessage = `No file was received.`;
          ctx.status = 404;
          ctx.body = new Response(ctx, requestDescription, errorMessage);
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
        const errorMessage = `No "file uuid" was provided`;
        ctx.status = 404;
        ctx.body = new Response(ctx, requestDescription, errorMessage);
        self.logger.error(errorMessage);
      } else if (file === undefined) {
        const errorMessage = `File ${fileUuid} not found`;
        ctx.status = 404;
        ctx.body = new Response(ctx, requestDescription, errorMessage);
        self.logger.error(errorMessage);
      } else {
        const reply = await self.deleteFile(fileUuid);
        if (reply !== false) {
          ctx.status = 200;
          ctx.body = new Response(ctx, requestDescription, reply);
        } else {
          const errorMessage = `File does not exist`;
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
      ctx.status = 200;
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
        ctx.status = 200;
        ctx.body = new Response(ctx, requestDescription, file);
      } else {
        const errorMessage = `File ${fileUuid} not found`;
        ctx.status = 404;
        ctx.body = new Response(ctx, requestDescription, errorMessage);
        self.logger.error(errorMessage);
      }
    } catch (ex) {
      const errorMessage = `To-do list "Read Task ${ctx.params.uuid}" request error: ${ex}`;
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, errorMessage);
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
        const errorMessage = `File "${fileUuid}" not found`;
        ctx.status = 404;
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

/**
 * Handle all logic at this endpoint for deleting all jobs
 */
const deleteAllFiles = (self) => {
  const requestDescription = `Delete All Files`;
  self.router.delete(`${self.routeEndpoint}/all/`, async (ctx) => {
    try {
      for (const file in self.files) {
        await self.deleteFile(self.files[file].uuid);
      }
      const status = `All files deleted`;
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, status);
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
  deleteAllFiles(self);
};

module.exports = filesRoutes;
