const convert = require(`koa-convert`);
const body = require(`koa-body`);
const fs = require(`fs-promise`);
const Promise = require(`bluebird`);

const Response = require(`../helpers/response`);

/**
 * Handle all file upload requests for the Conductor + '/upload' endpoint
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
          const errorMessage = `No file was received.`;
          throw errorMessage;
        }
        // Rename each file to be its filename plus a uuid
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
      const file = self.fileList[fileUuid];
      if (fileUuid === undefined) {
        const errorMessage = `"fileUuid" not provided`;
        throw errorMessage;
      }
      if (file === undefined) {
        const errorMessage = `File ${fileUuid} not found`;
        throw errorMessage;
      }
      const reply = await self.deleteFile(fileUuid);
      if (reply !== false) {
        ctx.status = 200;
        ctx.body = new Response(ctx, requestDescription, reply);
      } else {
        const errorMessage = `File does not exist`;
        throw errorMessage
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
  self.router.get(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, self.fileList);
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
  self.router.get(`${self.routeEndpoint}/:uuid`, async (ctx) => {
    try {
      // Parse the file's uuid
      const fileUuid = ctx.params.uuid;
      if (fileUuid === undefined) {
        const errorMessage = `uuid of file is not defined`;
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
      self.logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for reading a single task
 */
const downloadFile = (self) => {
  self.router.get(`${self.routeEndpoint}/:uuid/download`, async (ctx) => {
    const requestDescription = 'Download File';
    try {
      // Parse the file's uuid
      const fileUuid = ctx.params.uuid;
      if (fileUuid === undefined) {
        const errorMessage = `uuid of file is not defined`;
        throw errorMessage;
      }
      // Load the file from the list of files
      const file = self.fileList[fileUuid];
      if (file === undefined) {
        const errorMessage = `File ${fileUuid} not found`;
        throw errorMessage;
      }
      const fileName = file.name;
      const filePath = self.getFilePath(file);
      ctx.res.setHeader(`Content-disposition`, `attachment; filename=${fileName}`);
      ctx.body = fs.createReadStream(filePath);
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
      for (const file in self.fileList) {
        if (self.fileList.hasOwnProperty(file)) {
          await self.deleteFile(self.fileList[file].uuid);
        }
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
