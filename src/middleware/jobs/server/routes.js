/**
 * Handle all logic at this endpoint for reading all of the jobs
 */
const getJobs = (self) => {
  self.router.get(self.routeEndpoint + '/', async (ctx) => {
    try {
      ctx.body = self.jobs.map((job) => {
        return {
          id: job.id,
          state: job.fsm.current,
        };
      });
    } catch (ex) {
      ctx.body = { status: `To-do list "Read Tasks" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for creating a job
 */
const createJob = (self) => {
  self.router.post(self.routeEndpoint + '/', async (ctx) => {
    try {
      const uuid = ctx.request.body.uuid;
      const job = await self.createJobObject(uuid);
      ctx.body = {
        id: job.id,
        state: job.fsm.current,
      };
      ctx.status = 201;
    } catch (ex) {
      ctx.body = { status: `To-do list "Read Tasks" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

const jobsRoutes = (self) => {
  getJobs(self);
  createJob(self);
};

module.exports = jobsRoutes;
