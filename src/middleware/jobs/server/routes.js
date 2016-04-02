const Response = require(`../helpers/response`);

/**
 * Handle all logic at this endpoint for creating a job
 */
const createJob = (self) => {
  const requestDescription = `Create Job`;

  self.router.post(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const botId = ctx.request.body.botId;
      if (botId === undefined) {
        const errorMessage = `botId is not defined`;
        throw errorMessage;
      }

      const uuid = ctx.request.body.uuid;
      if (self.jobs[uuid] !== undefined) {
        const errorMessage = `Job ${uuid} is already defined`;
        throw errorMessage;
      }

      // Create and save the job object
      const jobObject = await self.createPersistentJob(botId, uuid);
      const jobJson = self.jobToJson(jobObject);
      ctx.status = 201;
      ctx.body = new Response(ctx, requestDescription, jobJson);
    } catch (ex) {
      const errorMessage = `Jobs API "Create Job" request error: ${ex}`;
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, errorMessage);
      self.logger.error(errorMessage);
    }
  });
};

/**
 * Handle all logic at this endpoint for reading all of the jobs
 */
const getJobs = (self) => {
  const requestDescription = `Get Jobs`;
  self.router.get(self.routeEndpoint + '/', async (ctx) => {
    try {
      const response = self.jobsToJson(self.jobs);
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, response);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for reading a single job
 */
const getJob = (self) => {
  const requestDescription = `Get Job`;
  self.router.get(`${self.routeEndpoint}/:uuid`, async (ctx) => {
    try {
      const jobUuid = ctx.params.uuid;
      const job = self.jobs[jobUuid];
      if (job) {
        const jobJson = self.jobToJson(job);
        ctx.status = 200;
        ctx.body = new Response(ctx, requestDescription, jobJson);
      } else {
        const errorMessage = `Job ${jobUuid} not found`;
        ctx.status = 404;
        ctx.body = new Response(ctx, requestDescription, errorMessage);
      }
    } catch (ex) {
      const errorMessage = `Get Job "${ctx.params.uuid}" request error: ${ex}`;
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, errorMessage);
      self.logger.error(errorMessage);
    }
  });
};

/**
 * Should assign a specific file to a job
 */
const setFile = (self) => {
  const requestDescription = `Set File to Job`;
  self.router.post(`${self.routeEndpoint}/:uuid/setFile`, async (ctx) => {

    // Find the job
    try {
      const jobUuid = ctx.params.uuid;
      const job = self.jobs[jobUuid];

      if (!job) {
        throw `Job is undefined`;
      }

      const fileUuid = ctx.request.body.fileUuid;
      const file = self.app.context.files.getFile(fileUuid);
      if (!file) {
        throw `File uuid is undefined`;
      }

      const reply = await self.setFile(job, file);
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, reply);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};


/**
 * Handle all logic at this endpoint for sending commands to a job
 */
const processJobCommand = (self) => {
  const requestDescription = `Process Job Command`;

// TODO kick off print of the file via the app.context.gcodeClient.startJob(some variable)
  self.router.post(`${self.routeEndpoint}/:uuid/`, async (ctx) => {
    try {
      // Find the job
      const jobUuid = ctx.params.uuid;
      const job = self.jobs[jobUuid];

      if (!job) {
        throw `job is undefined`;
      }

      // Then process the command for the job
      const command = ctx.request.body.command;
      if (!command) {
        throw `command is undefined`;
      }

      // populate this variable with the job (or the error), immediately after the command is triggered
      let commandReply;
      switch (command) {
        case `start`:
          // TODO provide feedback if bot is unavailable, before starting the job
          self.startJob(job);
          commandReply = self.jobToJson(job);
          break;
        case `pause`:
          self.pauseJob(job);
          commandReply = self.jobToJson(job);
          break;
        case `resume`:
          self.resumeJob(job);
          commandReply = self.jobToJson(job);
          break;
        case `cancel`:
          self.cancelJob(job);
          commandReply = self.jobToJson(job);
          break;
        default:
          commandReply = `Command ${command} is not supported`;
          throw commandReply;
      }
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, commandReply);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};

/**
 * Handle all logic at this endpoint for deleting a job
 */
const deleteJob = (self) => {
  const requestDescription = `Delete Job`;
  self.router.delete(self.routeEndpoint, async (ctx) => {
    try {
      const jobUuid = ctx.request.body.uuid;
      if (jobUuid === undefined) {
        const errorMessage = `Job uuid "${jobUuid}" is not valid.`;
        ctx.status = 404;
        ctx.body = new Response(ctx, requestDescription, errorMessage);
        return;
      } else {
        const deleteStatus = await self.deleteJob(jobUuid);
        ctx.status = 200;
        ctx.body = new Response(ctx, requestDescription, deleteStatus);
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
const deleteAllJobs = (self) => {
  const requestDescription = `Delete All Jobs`;
  self.router.delete(`${self.routeEndpoint}/all/`, async (ctx) => {
    try {
      for (const job in self.jobs) {
        await self.deleteJob(self.jobs[job].uuid);
      }
      const status = `All jobs deleted`;
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, status);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  });
};


const jobsRoutes = (self) => {
  getJobs(self);
  createJob(self);
  getJob(self);
  setFile(self);
  processJobCommand(self);
  deleteJob(self);
  deleteAllJobs(self);
};

module.exports = jobsRoutes;
