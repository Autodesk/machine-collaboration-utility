const Response = require(`../helpers/response`);

/**
 * Handle all logic at this endpoint for creating a job
 */
const createJob = (self) => {
  const requestDescription = `Create Job`;

  self.router.post(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      let uuid = ctx.request.body.uuid;
      if (self.jobs[uuid] !== undefined) {
        const errorMessage = `Job ${uuid} is already defined`;
        throw errorMessage;
      }
      // Create the job object
      const jobObject = await self.createJobObject(uuid);
      const jobJson = self.jobToJson(jobObject);
      const dbJob = await self.Job.create(jobJson);
      uuid = dbJob.dataValues.uuid;
      jobObject.id = dbJob.dataValues.id;
      self.jobs[uuid] = jobObject;
      self.app.io.emit('jobEvent', jobJson);
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
    let job;
    let file;

    // Find the job
    try {
      const jobUuid = ctx.params.uuid;
      job = self.jobs[jobUuid];

      if (!job) {
        throw `Job is undefined`;
      } else {
        await job.fsm.setFile();
      }
      // Find the File
      let fileUuid;
      try {
        fileUuid = ctx.request.body.fileUuid;
        if (fileUuid) {
          job.fileUuid = fileUuid;
          const jobJson = self.jobToJson(job);
          ctx.body = new Response(ctx, requestDescription, jobJson);
        } else {
          throw `File uuid undefined`;
        }
        file = self.app.context.files.getFile(fileUuid);
      } catch (ex) {
        await job.fsm.setFileFail();
        ctx.status = 405;
        ctx.body = new Response(ctx, requestDescription, ex);
        self.logger.error(ex);
        return;
      }

      // Assign the file to the job
      try {
        job.fileUuid = file.uuid;
        const jobJson = self.jobToJson(job);
        await job.fsm.setFileDone();
        ctx.body = new Response(ctx, requestDescription, jobJson);
      } catch (ex) {
        await job.fsm.setFileFail();
        ctx.status = 500;
        ctx.body = new Response(ctx, requestDescription, ex);
        self.logger.error(ex);
        return;
      }
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
          // TODO provide feedback if printer is unavailable, before starting the job
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
      const jobUuid = ctx.request.body.jobUuid;
      if (jobUuid === undefined) {
        const errorMessage = `Job uuid "${jobUuid}" is not valid.`;
        ctx.status = 404;
        ctx.body = new Response(ctx, requestDescription, errorMessage);
        return;
      } else {
        const deleteStatus = await self.deleteJob(jobUuid);
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
