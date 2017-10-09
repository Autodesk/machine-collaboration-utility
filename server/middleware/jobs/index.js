/* global logger */

const router = require('koa-router')();
const _ = require('lodash');

const jobsRouter = require('./routes');
const Job = require('./job');
const jobModel = require('./model');

/**
 * Jobs()
 *
 * A Jobs server class
 * A Job object represents the execution of a file by a bot
 * The Job maintains its state, as well as info about the bot and file being used
 *
 * @param {Object} app - The parent Koa app.
 * @param {string} routeEndpoint - The relative endpoint.
 *
 * @returns {Object} - A new Jobs server object
 */
const Jobs = function (app, routeEndpoint) {
  app.context.jobs = this; // External app reference variable

  this.app = app;
  this.routeEndpoint = routeEndpoint;
  this.router = router;
  this.jobList = {};
};

/**
 * initialize()
 *
 * Initialize the jobs endpoint
 * This includes
 * - Setting up the router
 * - Setting up the database model for a Job
 * - Loading all jobs saved in the database
 */
Jobs.prototype.initialize = async function initialize() {
  try {
    await this.setupRouter();
    // initial setup of the db
    this.JobModel = await jobModel(this.app);

    // load all existing jobs from the database
    let jobs;
    try {
      jobs = await this.JobModel.findAll();
    } catch (ex) {
      // In case of first boot, or schema changing, sync the database
      // WARNING this will drop all entries from the table
      await this.app.context.db.sync({ force: true });
      jobs = await this.JobModel.findAll();
    }

    for (const job of jobs) {
      const id = job.dataValues.id;
      const botUuid = job.dataValues.botUuid;
      const jobUuid = job.dataValues.uuid;
      const fileUuid = job.dataValues.fileUuid;
      const state = job.dataValues.state;

      // // Make some code here to change the state of old jobs when the server is restarted
      // switch (state) {
      //   case 'canceled':
      //     break;
      //   default:
      //     state = 'canceled';
      // }

      const jobObject = new Job({
        app: this.app,
        botUuid,
        fileUuid,
        uuid: jobUuid,
        initialState: state,
        id,
      });

      await jobObject.initialize();
      jobObject.percentComplete = job.dataValues.percentComplete;
      jobObject.started = job.dataValues.started;
      jobObject.elapsed = job.dataValues.elapsed;
      this.jobList[jobUuid] = jobObject;
    }
    logger.info('Jobs instance initialized');
  } catch (ex) {
    logger.error('Jobs initialization error', ex);
  }
};

/**
 * createJob()
 *
 * Creates a job object
 *
 * @param {String} botUuid - The bot to be associated with the job
 * @param {String} fileUuid - The file to be associated with the job
 * @param {String} jobUuid - An option, the Job UUID can be passed by a user
 * @param {Array} subscribers - Optionally pass an array of subscirbers updates whenever job events occur
 *
 * @returns {Object} - A new Jobs server object
 */
Jobs.prototype.createJob = async function createJob(botUuid, fileUuid, jobUuid, subscribers) {
  // Do not allow for duplicate uuid's.
  // If you pass a uuid, you are deleting the existing job
  // Note this is a bit wreckless, consider restructuring logic
  if (jobUuid && this.jobList[jobUuid] !== undefined) {
    // Delete the job from the database and the jobs object
    await this.deleteJob(jobUuid);
  }

  const jobObject = new Job({
    app: this.app,
    botUuid,
    fileUuid,
    jobUuid,
    subscribers,
  });

  const dbJob = await this.JobModel.create({
    uuid: jobObject.uuid,
    botUuid,
    fileUuid,
    state: null,
    started: null,
    elapsed: null,
    percentComplete: null,
  });
  // The job's id cannot be known until it is added to the database
  jobObject.id = dbJob.dataValues.id;

  await jobObject.initialize();
  const jobJson = jobObject.getJob();

  this.jobList[jobObject.uuid] = jobObject;
  logger.info('jobEvent', jobJson);
  this.app.io.broadcast('jobEvent', {
    uuid: jobObject.uuid,
    event: 'new',
    data: jobObject.getJob(),
  });
  return jobObject;
};

/**
 * setupRouter()
 *
 * Set up the jobs' instance's router
 *
 */
Jobs.prototype.setupRouter = async function setupRouter() {
  try {
    // Populate this.router with all routes
    // Then register all routes with the app
    await jobsRouter(this);

    // Register all router routes with the app
    this.app.use(this.router.routes()).use(this.router.allowedMethods());
    logger.info('Jobs router setup complete');
  } catch (ex) {
    logger.error('Jobs router setup error', ex);
  }
};

/**
 * getJob()
 *
 * A generic call to retreive a json friendly job by its uuid
 *
 * @param {string} jobUuid - The uuid of the desired job to be retrieved
 *
 * @returns {Object} - A job object
 */
Jobs.prototype.getJob = function getJob(jobUuid) {
  const job = this.jobList[jobUuid];
  if (job === undefined) {
    throw `Job ${jobUuid} could not be found`;
  }
  return job.getJob();
};

/**
 * getJob()
 *
 * A generic call to retreive a json friendly list of jobs
 *
 */
Jobs.prototype.getJobs = function getJobs() {
  const jobList = {};
  _.entries(this.jobList).map(([jobKey, job]) => {
    jobList[jobKey] = job.getJob();
  });
  return jobList;
};

/**
 * deleteJob()
 *
 * Deletes a job from the job list.
 * If the job is persistent, it will be removed from the database as well
 *
 * @param {string} jobUuid - The uuid of the desired job to be deleted
 *
 * @returns {String} - Desciption of operation success
 */
Jobs.prototype.deleteJob = async function deleteJob(jobUuid) {
  const theJob = this.jobList[jobUuid];
  if (theJob === undefined) {
    throw `Job ${jobUuid} does not exist`;
  }
  const dbJob = await this.JobModel.findById(theJob.id);
  await dbJob.destroy();
  delete this.jobList[jobUuid];
  logger.info(`Job ${jobUuid} deleted`);
  try {
    this.app.io.broadcast('jobEvent', {
      uuid: jobUuid,
      event: 'delete',
      data: null,
    });
  } catch (ex) {
    logger.error('Socket error', ex);
  }
  return `Job ${jobUuid} deleted`;
};

module.exports = Jobs;
