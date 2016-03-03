/**
 * Handle all logic at this endpoint for reading all of the jobs
 */
const getJobs = (self) => {
  self.router.get(self.routeEndpoint + '/', async (ctx) => {
    try {
      ctx.body = self.jobsToJson(self.jobs);
    } catch (ex) {
      ctx.body = { status: `Jobs API "Get Jobs" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for creating a job
 */
const createJob = (self) => {
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
      ctx.body = jobJson;
      ctx.status = 201;
    } catch (ex) {
      ctx.body = { status: `Jobs API "Create Job" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for reading a single job
 */
const getJob = (self) => {
  self.router.get(`${self.routeEndpoint}/:uuid`, async (ctx) => {
    try {
      const jobUuid = ctx.params.uuid;
      const job = self.jobs[jobUuid];
      if (job) {
        ctx.body = self.jobToJson(job);
      } else {
        ctx.status = 404;
        ctx.body = {
          error: `Job ${jobUuid} not found`,
        };
      }
    } catch (ex) {
      ctx.body = { status: `Get Job ${ctx.params.uuid}" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Should assign a specific file to a job
 */
const setFile = (self) => {
  self.router.post(`${self.routeEndpoint}/:uuid/setFile`, async (ctx) => {
    debugger;
    let job;
    let file;

    // Find the job
    try {
      const jobUuid = ctx.params.uuid;
      job = self.jobs[jobUuid];

      if (!job) {
        throw `job is undefined`;
      } else {
        await job.fsm.setFile();
      }
      // Find the File
      let fileUuid
      try {
        fileUuid = ctx.request.body.fileUuid;
        if (fileUuid) {
          job.fileUuid = fileUuid;
          ctx.body = self.jobToJson(job);
        } else {
          throw `file uuid undefined`;
        }
        file = self.app.context.files.getFile(fileUuid);
      } catch (ex) {
        self.logger.error(`Error setting file ${fileUuid} to job ${job.uuid}`);
        job.fsm.setFileFail();
        ctx.status = 405;
        ctx.body = { error: ex };
      }

      // Assign the file to the job
      try {
        job.fileUuid = file.uuid;
        await job.fsm.setFileDone();
        ctx.body = self.jobToJson(job);
      } catch (ex) {
        self.logger.error(`Error setting file ${fileUuid} to job ${job.uuid}: ${ex}`);
        job.fsm.setFileFail();
        ctx.body = { status: `Set file to job ${ctx.params.uuid} request error: ${ex}` };
        ctx.status = 500;
      }
    } catch (ex) {
      self.logger.error(`Set File Fail ${ex}`);
      ctx.body = { status: `Job "${ctx.params.uuid}" error: ${ex}` };
      ctx.status = 500;
    }
  });
};


/**
 * Handle all logic at this endpoint for sending commands to a job
 */
const processJobCommand = (self) => {
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

      switch (command) {
        case `start`:
          // TODO provide feedback if printer is unavailable, before starting the job
          self.startJob(job);
          ctx.body = self.jobToJson(job);
          break;
        case `pause`:
          self.pauseJob(job);
          ctx.body = self.jobToJson(job);
          break;
        case `resume`:
          self.resumeJob(job);
          ctx.body = self.jobToJson(job);
          break;
        case `cancel`:
          self.cancelJob(job);
          ctx.body = self.jobToJson(job);
          break;
        default:
          const errorMessage = `Command ${command} is not supported`;
          throw errorMessage;
      }
    } catch (ex) {
      ctx.body = { status: `Job ${ctx.params.uuid} command request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for deleting a job
 */
const deleteJob = (self) => {
  self.router.delete(self.routeEndpoint, async (ctx) => {
    try {
      const jobUuid = ctx.request.body.jobUuid;
      if (jobUuid === undefined) {
        ctx.status = 404;
        ctx.body = `Job uuid "${jobUuid}" is not valid.`;
      } else {
        ctx.body = await self.deleteJob(jobUuid);
      }
    } catch (ex) {
      ctx.body = { status: `To-do list "Delete Job" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for deleting all jobs
 */
const deleteAllJobs = (self) => {
  self.router.delete(`${self.routeEndpoint}/all/`, async (ctx) => {
    try {
      for (const job in self.jobs) {
        await self.deleteJob(self.jobs[job].uuid);
      }
      ctx.body = `All jobs deleted`;
    } catch (ex) {
      ctx.body = { status: `Job API "Delete all Jobs" request error: ${ex}` };
      ctx.status = 500;
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
