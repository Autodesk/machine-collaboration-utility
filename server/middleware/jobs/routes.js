const Response = require(`../helpers/response`);
const Promise = require(`bluebird`);
const _ = require(`underscore`);
const bsync = require(`asyncawait/async`);
const bwait = require(`asyncawait/await`);

 /**
  * getJobs()
  *
  * Retreive a dictionary of all the jobs
  *
  * @param {object} self - The object representing the context for "Jobs" middleware
  */
const getJobs = (self) => {
  const requestDescription = `Get Jobs`;
  self.router.get(`${self.routeEndpoint}/`, bsync((ctx) => {
    try {
      const response = self.getJobs();
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, response);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  }));
};

 /**
  * deleteAllJobs()
  *
  * Handle all logic at this endpoint for deleting all jobs from the database
  *
  * @param {object} self - The object representing the context for "Jobs" middleware
  */
const deleteAllJobs = (self) => {
  const requestDescription = `Delete All Jobs`;
  self.router.delete(`${self.routeEndpoint}/all/`, bsync((ctx) => {
    try {
      bwait(Promise.map(
        _.pairs(self.jobList),
        bsync(([jobKey, job]) => {
          bwait(self.deleteJob(jobKey));
        }),
        { concurrency: 5 }
      ));
      const status = `All jobs deleted`;
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, status);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  }));
};

 /**
  * createJob()
  *
  * Handle all logic at this endpoint for creating a job
  *
  * @param {object} self - The object representing the context for "Jobs" middleware
  */
const createJob = (self) => {
  const requestDescription = `Create Job`;

  self.router.post(`${self.routeEndpoint}/`, bsync((ctx) => {
    try {
      // custom UUID can be passed, but it's not necessary
      const uuid = ctx.request.body.uuid;

      const botUuid = ctx.request.body.botUuid;
      if (botUuid === undefined) {
        const errorMessage = `botUuid is not defined`;
        throw errorMessage;
      }

      const fileUuid = ctx.request.body.fileUuid;
      if (fileUuid === undefined) {
        throw `fileUuid is undefined`;
      }

      const file = self.app.context.files.getFile(fileUuid);
      if (!file) {
        throw `File not found`;
      }

      // Create and save the job object
      const jobObject = bwait(self.createJob(botUuid, fileUuid, uuid));

      const startJob = String(ctx.request.body.startJob) === `true`;
      if (startJob) {
        bwait(jobObject.start());
      }

      const jobJson = jobObject.getJob();
      ctx.status = 201;
      ctx.body = new Response(ctx, requestDescription, jobJson);
    } catch (ex) {
      const errorMessage = `Jobs API "Create Job" request error: ${ex}`;
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, errorMessage);
      self.logger.error(errorMessage);
    }
  }));
};

/**
 * getJob()
 *
 * Retreive a single job object
 *
 * @param {object} self - The object representing the context for "Jobs" middleware
 */
const getJob = (self) => {
  const requestDescription = `Get Job`;
  self.router.get(`${self.routeEndpoint}/:uuid`, bsync((ctx) => {
    try {
      const jobUuid = ctx.params.uuid;
      if (jobUuid === undefined) {
        throw `jobUuid is undefined`;
      }
      const job = self.jobList[jobUuid];
      if (job) {
        const reply = job.getJob();
        ctx.status = 200;
        ctx.body = new Response(ctx, requestDescription, reply);
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
  }));
};

/**
 * deleteJob()
 *
 * Handle all logic at this endpoint for deleting a job
 *
 * @param {object} self - The object representing the context for "Jobs" middleware
 */
const deleteJob = (self) => {
  const requestDescription = `Delete Job`;
  self.router.delete(self.routeEndpoint, bsync((ctx) => {
    try {
      const jobUuid = ctx.request.body.uuid;
      if (jobUuid === undefined) {
        const errorMessage = `Job uuid "${jobUuid}" is undefined.`;
        throw errorMessage;
      }

      const deleteStatus = bwait(self.deleteJob(jobUuid));
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, deleteStatus);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  }));
};


/**
 * processJobCommand()
 *
 * Handle all logic at this endpoint for sending commands to a job
 *
 * @param {object} self - The object representing the context for "Jobs" middleware
 */
const processJobCommand = (self) => {
  const requestDescription = `Process Job Command`;
  self.router.post(`${self.routeEndpoint}/:uuid/`, bsync((ctx) => {
    try {
      // Find the job
      const jobUuid = ctx.params.uuid;
      if (jobUuid === undefined) {
        const errorMessage = `Job uuid "${jobUuid}" is undefined.`;
        throw errorMessage;
      }

      const job = self.jobList[jobUuid];
      if (!job) {
        const errorMessage = `job is undefined`;
        throw errorMessage;
      }

      // Then process the command for the job
      const command = ctx.request.body.command;
      if (command === undefined) {
        const errorMessage = `"command" is undefined`;
        throw errorMessage;
      }

      const reply = bwait(job.processCommand(command));
      ctx.status = 200;
      ctx.body = new Response(ctx, requestDescription, reply);
    } catch (ex) {
      ctx.status = 500;
      ctx.body = new Response(ctx, requestDescription, ex);
      self.logger.error(ex);
    }
  }));
};

const jobsRoutes = (self) => {
  // Jobs CRUD
  getJobs(self);
  deleteAllJobs(self);

  // Job CRUD
  createJob(self);
  getJob(self);
  deleteJob(self);

  // Job COMMANDS
  processJobCommand(self);
};

module.exports = jobsRoutes;
