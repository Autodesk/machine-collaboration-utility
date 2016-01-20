const Promise = require(`bluebird`);
const ip = Promise.promisifyAll(require(`ip`));
const config = require(`../../config`);

/**
 * Render the to-do list's documentation
 */
const getDocsRequests = (self) => {
  self.router.get(self.routeEndpoint + 'docs', async (ctx) => {
    const serverIpAddress = await ip.address();
    const docLocation = `docs/middleware/toDoList.yaml`;
    const middlewareLocation = `http://${serverIpAddress}:${process.env.PORT}/${docLocation}`;
    // TODO ^ may need to modify path based on static file server path
    ctx.render(`docs`, {
      title: `To-Do List Docs`,
      middlewareLocation,
    });
  });
};

/**
 * Handle all logic at this endpoint for creating a task
 */
const createTask = (self) => {
  self.router.post(self.routeEndpoint, async (ctx) => {
    try {
      if (ctx.header.accept.toLowerCase() === `application/json`) {
        const description = ctx.request.body.description;
        if (description === undefined || typeof description !== 'string' || description.length <= 0) {
          ctx.status = 404;
          ctx.body = `Task description "${description}" is not valid.`;
        } else {
          const taskCreated = await self.Task.create({ description });
          ctx.body = {
            id: taskCreated.id,
            description: taskCreated.description,
          };
        }
      } else {
        ctx.status = 404;
        ctx.body = `Only accepts application/json requests`;
      }
    } catch (ex) {
      ctx.body = { status: `To-do list "Create Task" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for deleting a task
 */
const deleteTask = (self) => {
  self.router.delete(self.routeEndpoint, async (ctx) => {
    try {
      if (ctx.header.accept.toLowerCase() === `application/json`) {
        const taskId = Number(ctx.request.body.id);
        if (taskId === undefined || isNaN(taskId) || taskId <= 0) {
          ctx.status = 404;
          ctx.body = `Task id "${taskId}" is not valid.`;
        } else {
          await self.Task.findById(taskId).then(async (task) => {
            await task.destroy();
          });
          ctx.body = `Task ${taskId} deleted`;
        }
      } else {
        ctx.status = 404;
        ctx.body = `Only accepts application/json requests`;
      }
    } catch (ex) {
      ctx.body = { status: `To-do list "Delete Task" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for reading all of the tasks
 */
const readTasksAndRenderUI = (self) => {
  self.router.get(self.routeEndpoint, async (ctx) => {
    try {
      if (ctx.header.accept.toLowerCase() === `application/json`) {
        const tasks = await self.Task.findAll().map((task) => {
          return {
            description: task.dataValues.description,
            id: task.dataValues.id,
          };
        });
        ctx.body = tasks;
      } else {
        // Collect an array of each task's description
        const tasks = await self.Task.findAll().map((task) => {
          return {
            description: task.dataValues.description,
            id: task.dataValues.id,
          };
        });

        // Pass the tasks to the front end
        ctx.render(`toDoList/index`, {
          title: `To-Do List`,
          tasks,
        });
      }
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

const toDoListRoutes = (self) => {
  getDocsRequests(self);
  createTask(self);
  deleteTask(self);
  readTasksAndRenderUI(self);
  readTask(self);
  updateTask(self);
};

module.exports = toDoListRoutes;
