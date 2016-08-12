const router = require(`koa-router`)();
const bsync = require(`asyncawait/async`);
const bwait = require(`asyncawait/await`);
const _ = require(`underscore`);

const jobsRouter = require(`./routes`);
const Job = require(`./job`);
const jobModel = require(`./model`);

/**
 * A Jobs server class
 * @param {Object} app - The parent Koa app.
 * @param {string} routeEndpoint - The relative endpoint.
 */
const Jobs = function(app, routeEndpoint) {
  app.context.jobs = this; // External app reference variable

  this.app = app;
  this.logger = app.context.logger;
  this.routeEndpoint = routeEndpoint;
  this.router = router;
  this.jobList = {};
};

/**
 * initialize the jobs endpoint
 */
Jobs.prototype.initialize = bsync(function initialize() {
  try {
    bwait(this.setupRouter());
    // initial setup of the db
    this.JobModel = bwait(jobModel(this.app));

    // load all existing jobs from the database
    let jobs;
    try {
      jobs = bwait(this.JobModel.findAll());
    } catch(ex) {
      // In case of first boot, or schema changing, sync the database
      // WARNING this will drop all entries from the table
      bwait(this.app.context.db.sync({ force: true }));
      jobs = bwait(this.JobModel.findAll());
    }
    for (const job of jobs) {
      const botUuid = job.dataValues.botUuid;
      const jobUuid = job.dataValues.uuid;
      const id = job.dataValues.id;
      const fileUuid = job.dataValues.fileUuid;
      let state = job.dataValues.state;
      switch(state) {
        case `canceled`:
          break;
        default:
          state = `canceled`;
      }
      const jobObject = new Job(this.app, botUuid, fileUuid, jobUuid, state, id);
      bwait(jobObject.initialize());
      jobObject.percentComplete = job.dataValues.percentComplete;
      jobObject.started = job.dataValues.started;
      jobObject.elapsed = job.dataValues.elapsed;
      this.jobList[jobUuid] = jobObject;
    }
/*
let botsDbArray;
try {
  botsDbArray = bwait(this.BotModel.findAll());
} catch (ex) {
  // In case of first boot, or schema changing, sync the database
  // WARNING this will drop all entries from the table
  bwait(this.app.context.db.sync({ force: true }));
  botsDbArray = bwait(this.BotModel.findAll());
}
*/
    this.logger.info(`Jobs instance initialized`);
  } catch (ex) {
    this.logger.error(`Jobs initialization error`, ex);
  }
});

Jobs.prototype.createPersistentJob = bsync(function createPersistentJob(botUuid, fileUuid, jobUuid, loud) {
  const jobObject = new Job(this.app, botUuid, fileUuid, jobUuid, undefined, undefined, loud);
  bwait(jobObject.initialize());
  const jobJson = jobObject.getJob();
  // const dbJob = await this.JobModel.create(jobJson);
  //
  // // Hack, the job's id cannot be known until it is added to the database
  // jobObject.id = dbJob.dataValues.id;

  this.jobList[jobObject.uuid] = jobObject;
  if (loud) {
    this.logger.info('jobEvent', jobJson);
    this.app.io.emit(`jobEvent`, {
      uuid: jobObject.uuid,
      event: `new`,
      data: jobObject.getJob(),
    });
  }
  return jobObject;
});

/**
 * Set up the jobs' instance's router
 */
Jobs.prototype.setupRouter = bsync(function setupRouter() {
  try {
    // Populate this.router with all routes
    // Then register all routes with the app
    bwait(jobsRouter(this));

    // Register all router routes with the app
    this.app.use(this.router.routes()).use(this.router.allowedMethods());
    this.logger.info(`Jobs router setup complete`);
  } catch (ex) {
    this.logger.error(`Jobs router setup error`, ex);
  }
});

/**
 * A generic call to retreive a json friendly job by its uuid
 */
Jobs.prototype.getJob = function getJob(jobUuid) {
  return this.jobList[jobUuid].getJob();
};

/**
 * A generic call to retreive a json friendly list of jobs
 */
Jobs.prototype.getJobs = function getJobs() {
  const jobList = {};
  _.pairs(this.jobList).map(([jobKey, job]) => {
    jobList[jobKey] = job.getJob();
  });
  return jobList;
};

Jobs.prototype.deleteJob = bsync(function deleteJob(jobUuid) {
  const theJob = this.jobList[jobUuid];
  // const dbJob = await this.JobModel.findById(theJob.id);
  // await dbJob.destroy();
  delete this.jobList[jobUuid];
  this.logger.info(`Job ${jobUuid} deleted`);
  try {
    this.app.io.emit('jobEvent', {
      uuid: jobUuid,
      event: `delete`,
      data: null,
    });
  } catch (ex) {
    this.logger.error(`Socket error`, ex);
  }
  return `Job ${jobUuid} deleted`;
});

module.exports = Jobs;
