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
      const uuid = ctx.request.body.uuid;
      const job = await self.createJobObject(uuid);
      ctx.body = {
        id: job.id,
        state: job.fsm.current,
      };
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
  self.router.get(`${self.routeEndpoint}/:id`, async (ctx) => {
    try {
      const jobId = ctx.params.id;
      const job = self.jobs.find((inJob) => {
        return inJob.id === jobId;
      });
      if (job) {
        ctx.body = job;
      } else {
        ctx.status = 404;
        ctx.body = {
          error: `Job ${jobId} not found`,
        };
      }
    } catch (ex) {
      ctx.body = { status: `Get Job ${ctx.params.id}" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Should assign a specific file to a job
 */
const setFile = (self) => {
  self.router.post(`${self.routeEndpoint}/:id/setFile`, async (ctx) => {
    let job;
    let file;

    // Find the job
    try {
      const jobId = ctx.params.id;
      job = self.jobs.find((inJob) => {
        return inJob.id === jobId;
      });

      if (!job) {
        throw `job is undefined`;
      } else {
        job.fsm.setFile();
      }
      // Find the File
      try {
        const fileId = ctx.request.body.fileId;
        if (fileId) {
          job.fileId = fileId;
          ctx.body = self.jobToJson(job);
        } else {
          throw `fileId undefined`;
        }
        file = self.app.context.files.getFile(fileId);
      } catch (ex) {
        job.fsm.setFileFail();
        ctx.status = 405;
        ctx.body = { error: ex };
      }

      // Assign the file to the job
      try {
        job.fileId = file.id;
        await job.fsm.setFileDone();
        ctx.body = self.jobToJson(job);
      } catch (ex) {
        job.fsm.setFileFail();
        ctx.body = { status: `Set file to job ${ctx.params.id} request error: ${ex}` };
        ctx.status = 500;
      }
    } catch (ex) {
      ctx.body = { status: `Job "${ctx.params.id}" error: ${ex}` };
      ctx.status = 500;
    }
  });
};


/**
 * Handle all logic at this endpoint for sending commands to a job
 */
const processJobCommand = (self) => {
// TODO kick off print of the file via the app.context.gcodeClient.startJob(some variable)
  self.router.post(`${self.routeEndpoint}/:id/`, async (ctx) => {
    try {
      // Find the job
      const jobId = ctx.params.id;
      const job = self.jobs.find((inJob) => {
        return inJob.id === jobId;
      });

      if (!job) {
        throw `job is undefined`;
      }

      // Then process the command for the job
      const command = ctx.request.body.command;
      if (!command) {
        throw `command is undefined`;
      }

      switch (command) {
        case `foo`:
          console.log(`yooooo`);
          break;
        default:
          console.log(`eyyy`);
      }
    } catch (ex) {
      ctx.body = { status: `Job ${ctx.params.id} command request error: ${ex}` };
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
};

module.exports = jobsRoutes;
