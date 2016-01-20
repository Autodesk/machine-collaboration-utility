const convert = require(`koa-convert`);
const body = require(`koa-body`);
const fs = require(`fs-promise`);
const Promise = require(`bluebird`);
const unzip = Promise.promisifyAll(require(`unzip2`));
const ip = Promise.promisifyAll(require(`ip`));
const config = require(`../../config`);

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
    convert(body(
      {
        multipart: true,
        formidable: {
          uploadDir: self.uploadDir,
          onFileBegin: (field, file) => {
            try {
              // TODO abort if the file extension is not supported
              const fileNameArray = file.name.split(`.`);
              const fileName = self.uploadDir + `/` + fileNameArray[0];
              const fileExt = `.` + fileNameArray[1];
              const fullFileName = fileName + fileExt;
              file.path = fullFileName;
              self.mostRecentUpload = fullFileName;
            } catch (ex) {
              self.logger.error(`File Upload Error`, ex);
            }
          },
        },
      }
    )),
    async (ctx) => {
      try {
        // Once the file is uploaded, then add it to the array of available files
        self.files.push(self.mostRecentUpload);
        ctx.body = `File successfully uploaded`;
      } catch (ex) {
        ctx.body = { status: `Server error: ` + ex };
        ctx.status = 500;
      }
    }
  );
};

/**
 * Handle all logic at this endpoint for deleting a task
 */
const deleteFile = (self) => {
  self.router.delete(self.routeEndpoint, async (ctx) => {
    try {
      // see if file exists
      // if (taskId === undefined || isNaN(taskId) || taskId <= 0) {
      //   ctx.status = 404;
      //   ctx.body = `File does not exist`;
      // } else {
      // if it does, delete it and remove it from the file array
      ctx.body = `File deleted`;
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
      ctx.body = 'sup';
    } catch (ex) {
      ctx.body = { status: `To-do list "Read Tasks" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for reading a single task
 */
const readTask = (self) => {
  self.router.get(self.routeEndpoint + `:id`, async (ctx) => {
    try {
      if (ctx.header.accept.toLowerCase() === `application/json`) {
        const taskId = ctx.params.id;
        const task = await self.Task.findById(taskId);
        ctx.body = {
          description: task.description,
          id: task.id,
        };
      } else {
        ctx.status = 404;
        ctx.body = `Only accepts application/json requests`;
      }
    } catch (ex) {
      ctx.body = { status: `To-do list "Read Task ${ctx.params.id}" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for updating a single task
 */
const updateTask = (self) => {
  self.router.put(`/`, async (ctx) => {
    console.log('task request\n', ctx);
    try {
      if (ctx.header.accept.toLowerCase() === `application/json`) {
        const taskId = ctx.request.body.id;
        const description = ctx.request.body.description;
        console.log('request', ctx.request, ctx.request.body);
        console.log('description', description);
        if (description === undefined || typeof description !== 'string' || description.length <= 0) {
          ctx.status = 404;
          ctx.body = `Task description "${description}" is not valid.`;
        } else {
          const task = await self.Task.findById(taskId);
          task.updateAttributes({
            description,
          });
          ctx.body = {
            description: task.description,
            id: task.id,
          };
        }
      } else {
        ctx.status = 404;
        ctx.body = `Only accepts application/json requests`;
      }
    } catch (ex) {
      ctx.body = { status: `To-do list "Read Task ${ctx.params.id}" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

const filesRoutes = (self) => {
  getDocs(self);
  // uploadFile(self);
  // deleteFile(self);
  // getFiles(self);
  // readTask(self);
  // updateTask(self);
};

module.exports = filesRoutes;
