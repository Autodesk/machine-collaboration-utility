const convert = require(`koa-convert`);
const body = require(`koa-body`);
const fs = require(`fs-promise`);
const Promise = require(`bluebird`);

/**
 * Handle all file upload requests for the Conductor + '/upload' endpoint
 */
const uploadFile = (self) => {
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
          ctx.body = uploadedFiles;
        } else {
          ctx.body = `Error: No file was received.`;
          ctx.status = 404;
        }
      } catch (ex) {
        self.logger.error('Upload file error', ex);
        ctx.body = { status: `Server error: ` + ex };
        ctx.status = 500;
      }
    }
  );
};

/**
 * Handle all logic at this endpoint for deleting a file
 */
const deleteFile = (self) => {
  self.router.delete(self.routeEndpoint, async (ctx) => {
    try {
      const fileUuid = ctx.request.body.uuid;
      const file = self.files[fileUuid];
      if (fileUuid === undefined) {
        ctx.status = 404;
        ctx.body = { error: `No file "uuid" was provided` };
      } else if (file === undefined) {
        ctx.status = 404;
        ctx.body = { error: `File ${fileUuid} not found` };
      } else {
        const filePath = self.getFilePath(file);
        const fileExists = await fs.exists(filePath);
        if (fileExists) {
          // Delete the file
          await fs.unlink(filePath);
          self.logger.info('Just deleted file', filePath);
          // Remove the file object from the 'files' array
          delete self.files[fileUuid];
          ctx.body = { status: `File deleted` };
        }
      }
    } catch (ex) {
      self.logger.error('Delete file error', ex);
      ctx.body = { status: `"Delete File" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for reading all of the tasks
 */
const getFiles = (self) => {
  self.router.get(self.routeEndpoint + '/', async (ctx) => {
    try {
      ctx.body = self.files;
    } catch (ex) {
      ctx.body = { status: `To-do list "Read Tasks" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for reading a single task
 */
const getFile = (self) => {
  self.router.get(self.routeEndpoint + `/:uuid`, async (ctx) => {
    try {
      const fileUuid = ctx.params.uuid;
      const file = self.files[fileUuid];
      if (file) {
        ctx.body = file;
      } else {
        ctx.status = 404;
        ctx.body = {
          error: `File ${fileUuid} not found`,
        };
      }
    } catch (ex) {
      ctx.body = { status: `To-do list "Read Task ${ctx.params.uuid}" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

const filesRoutes = (self) => {
  uploadFile(self);
  deleteFile(self);
  getFiles(self);
  getFile(self);
};

module.exports = filesRoutes;
