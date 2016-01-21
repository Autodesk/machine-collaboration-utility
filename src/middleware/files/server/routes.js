const convert = require(`koa-convert`);
const body = require(`koa-body`);
const fs = require(`fs-promise`);
const Promise = require(`bluebird`);
const ip = Promise.promisifyAll(require(`ip`));

/**
 * Render the to-do list's documentation
 */
const getDocs = (self) => {
  self.router.get(self.routeEndpoint + '/docs', async (ctx) => {
    const serverIpAddress = await ip.address();
    const docLocation = `docs/middleware/files.yaml`;
    const middlewareLocation = `http://${serverIpAddress}:${process.env.PORT}/${docLocation}`;
    // TODO ^ may need to modify path based on static file server path
    ctx.render(`docs`, {
      title: `Files List Docs`,
      middlewareLocation,
    });
  });
};

/**
 * Handle all file upload requests for the Conductor + '/upload' endpoint
 */
const uploadFile = (self) => {
  self.router.post(
    self.routeEndpoint + '/',
    convert(body({ multipart: true })),
    async (ctx) => {
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
                    await self.createFileObject(file);
                  },
                  { concurrency: 4 }
                );
              } else {
                await self.createFileObject(files[theFile]);
              }
            },
            { concurrency: 4 }
          );
          // Once the file is uploaded, then add it to the array of available files
          ctx.body = `File successfully uploaded`;
        } else {
          ctx.body = `Error: No file was received.`;
          ctx.status = 404;
        }
      } catch (ex) {
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
      const fileId = Number(ctx.request.body.id);
      const file = self.files.find((inFile) => {
        return Number(inFile.id) === fileId;
      });
      if (fileId === undefined) {
        ctx.status = 404;
        ctx.body = { error: `No file "id" was provided` };
      } else if (file === undefined) {
        ctx.status = 404;
        ctx.body = { error: `File ${fileId} not found` };
      } else {
        const filePath = self.getFilepath(file);
        const fileExists = await fs.exists(filePath);
        if (fileExists) {
          // Delete the file
          await fs.unlink(filePath);

          // Remove the file object from the 'files' array
          for (let i = 0; i < self.files.length; i++) {
            if (Number(self.files[i].id) === fileId) {
              self.files.splice(i, 1);
            }
          }
          ctx.body = `File deleted`;
        }
      }
    } catch (ex) {
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
  self.router.get(self.routeEndpoint + `/:id`, async (ctx) => {
    try {
      const fileId = ctx.params.id;
      const file = self.files.find((inFile) => {
        return inFile.id === fileId;
      });
      if (file) {
        ctx.body = file;
      } else {
        ctx.status = 404;
        ctx.body = {
          error: `File ${fileId} not found`,
        };
      }
    } catch (ex) {
      ctx.body = { status: `To-do list "Read Task ${ctx.params.id}" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

const filesRoutes = (self) => {
  getDocs(self);
  uploadFile(self);
  deleteFile(self);
  getFiles(self);
  getFile(self);
};

module.exports = filesRoutes;
