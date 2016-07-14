const router = require(`koa-router`)();
const uuidGenerator = require(`node-uuid`);
const Promise = require(`bluebird`);
const StateMachine = Promise.promisifyAll(require(`./stateMachine`));
const Stopwatch = Promise.promisifyAll(require('timer-stopwatch'));

const jobsRouter = require(`./routes`);
const jobModel = require(`./model`);
const Job = require(`./job`);

/**
 * This is a Jobs class.
 */
class Jobs {
  /**
   * A Jobs server class
   * @param {Object} app - The parent Koa app.
   * @param {string} routeEndpoint - The relative endpoint.
   */
  constructor(app, routeEndpoint) {
    app.context.jobs = this; // External app reference variable

    this.app = app;
    this.logger = app.context.logger;
    this.routeEndpoint = routeEndpoint;
    this.router = router;
    this.jobList = {};
  }

  /**
   * initialize the jobs endpoint
   */
  async initialize() {
    try {
      await this.setupRouter();
      // initial setup of the db
      this.JobModel = await jobModel(this.app);

      // load all existing jobs from the database
      const jobs = await this.JobModel.findAll();
      for (const job of jobs) {
        const botUuid = job.dataValues.botUuid;
        const jobUuid = job.dataValues.uuid;
        const state = job.dataValues.state;
        const id = job.dataValues.id;
        const fileUuid = job.dataValues.fileUuid;
        const jobObject = new Job(this.app, botUuid, fileUuid, jobUuid, state, id);
        await jobObject.initialize();
        jobObject.percentComplete = job.dataValues.percentComplete;
        jobObject.started = job.dataValues.started;
        jobObject.elapsed = job.dataValues.elapsed;
        this.jobList[jobUuid] = jobObject;
      }

      this.logger.info(`Jobs instance initialized`);
    } catch (ex) {
      this.logger.error(`Jobs initialization error`, ex);
    }
  }

  async createPersistentJob(botUuid, fileUuid, jobUuid) {
    const jobObject = new Job(this.app, botUuid, fileUuid, jobUuid);
    await jobObject.initialize();
    const jobJson = jobObject.getJob();
    const dbJob = await this.JobModel.create(jobJson);

    // Hack, the job's id cannot be known until it is added to the database
    jobObject.id = dbJob.dataValues.id;

    this.jobList[dbJob.dataValues.uuid] = jobObject;
    this.logger.info('jobEvent', jobJson);
    // this.app.io.emit('jobEvent', jobJson);
    return jobObject;
  }

  /**
   * Set up the jobs' instance's router
   */
  async setupRouter() {
    try {
      // Populate this.router with all routes
      // Then register all routes with the app
      await jobsRouter(this);

      // Register all router routes with the app
      this.app.use(this.router.routes()).use(this.router.allowedMethods());
      this.logger.info(`Jobs router setup complete`);
    } catch (ex) {
      this.logger.error(`Jobs router setup error`, ex);
    }
  }

  /**
   * A generic call to retreive a json friendly job by its uuid
   */
  getJob(jobUuid) {
    return this.jobList[jobUuid].getJob();
  }

  /**
   * A generic call to retreive a json friendly list of jobs
   */
  getJobs() {
    const jobList = {};
    Object.entries(this.jobList).map(([jobKey, job]) => {
      jobList[jobKey] = job.getJob();
    });
    return jobList;
  }

  async deleteJob(jobUuid) {
    const theJob = this.jobList[jobUuid];
    const dbJob = await this.JobModel.findById(theJob.id);
    // this.app.io.emit('deleteJob', theJobJson);
    await dbJob.destroy();
    delete this.jobList[jobUuid];
    this.logger.info(`Job ${jobUuid} deleted`);
    try {
      this.app.io.emit('updateJobs', this.jobList);
    } catch (ex) {
      this.logger.error(`Socket error`, ex);
    }
    return `Job ${jobUuid} deleted`;
  }
}

module.exports = Jobs;
