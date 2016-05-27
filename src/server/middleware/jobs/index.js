const router = require(`koa-router`)();
const uuidGenerator = require(`node-uuid`);
const Promise = require(`bluebird`);
const StateMachine = Promise.promisifyAll(require(`./stateMachine`));
const Stopwatch = Promise.promisifyAll(require('timer-stopwatch'));

const jobsRouter = require(`./routes`);
const jobModel = require(`./model`);

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
    const self = this;
    try {
      await this.setupRouter();
      // initial setup of the db
      this.Job = await jobModel(this.app);

      // load all existing jobs from the database
      const jobs = await this.Job.findAll();
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const botId = job.dataValues.botId;
        const uuid = job.dataValues.uuid;
        const state = job.dataValues.state;
        const id = job.dataValues.id;
        const fileUuid = job.dataValues.fileUuid;
        const jobObject = await self.createJobObject(botId, uuid, state, id, fileUuid);
        jobObject.percentComplete = job.dataValues.percentComplete;
        jobObject.started = job.dataValues.started;
        jobObject.elapsed = job.dataValues.elapsed;
        self.jobList[uuid] = jobObject;
      }

      this.logger.info(`Jobs instance initialized`);
    } catch (ex) {
      this.logger.error(`Jobs initialization error`, ex);
    }
  }

  /**
   * Create a job object
   */
  async createJobObject(botId, userUuid, initialState, id, fileUuid) {
    const self = this;

    if (botId === undefined) {
      throw `Printer ID is not defined`;
    }

    const cancelable = ['running', 'paused'];
    const uuid = userUuid ? userUuid : await uuidGenerator.v1();
    const fsmSettings = {
      uuid,
      initial: initialState ? initialState : 'created',
      error: (eventName, from, to, args, errorCode, errorMessage) => {
        const fsmError = `Invalid job ${uuid} state change on event "${eventName}" from "${from}" to "${to}"\nargs: "${args}"\nerrorCode: "${errorCode}"\nerrorMessage: "${errorMessage}"`;
        this.logger.error(fsmError);
        throw fsmError;
      },
      events: [
        /* eslint-disable no-multi-spaces */
        { name: 'setFile',     from: 'created',     to: 'settingFile' },
        { name: 'setFileFail', from: 'settingFile', to: 'created'     },
        { name: 'setFileDone', from: 'settingFile', to: 'ready'       },
        { name: 'start',       from: 'ready',       to: 'starting'    },
        { name: 'startFail',   from: 'starting',    to: 'ready'       },
        { name: 'startDone',   from: 'starting',    to: 'running'     },
        { name: 'pause',       from: 'running',     to: 'pausing'     },
        { name: 'pause',       from: 'paused',      to: 'paused'      },
        { name: 'pauseFail',   from: 'pausing',     to: 'running'     },
        { name: 'pauseDone',   from: 'pausing',     to: 'paused'      },
        { name: 'resume',      from: 'paused',      to: 'resuming'    },
        { name: 'resume',      from: 'running',     to: 'running'     },
        { name: 'resumeFail',  from: 'resuming',    to: 'paused'      },
        { name: 'resumeDone',  from: 'resuming',    to: 'running'     },
        { name: 'runningDone', from: 'running',     to: 'complete'    },
        { name: 'cancel',      from: cancelable,    to: 'canceling'   },
        { name: 'cancelFail',  from: 'canceling',   to: 'canceled'    },
        { name: 'cancelDone',  from: 'canceling',   to: 'canceled'    },
        /* eslint-enable no-multi-spaces */
      ],
      callbacks: {
        onenterstate: async (event, from, to) => {
          self.logger.info(`Job event ${event}: Transitioning from ${from} to ${to}.`);
          if (from !== `none`) {
            const theJob = self.jobList[uuid];
            if (event.indexOf('Done') !== -1) {
              try {
                // As soon as an event successfully transistions, update it in the database
                const dbJob = await self.Job.findById(theJob.id);
                await Promise.delay(0); // For some reason this can't happen in the same tick
                await dbJob.updateAttributes({
                  state: theJob.fsm.current,
                  fileUuid: theJob.fileUuid,
                  started: theJob.started,
                  elapsed: theJob.stopwatch.ms,
                  percentComplete: theJob.percentComplete,
                });
                self.logger.info(`Job event ${event} for job ${uuid} successfully updated to ${theJob.fsm.current}`);
              } catch (ex) {
                self.logger.info(`Job event ${event} for job ${uuid} failed to update: ${ex}`);
              }
            }
            if (event === `startup`) {
              self.app.io.emit(`jobEvent`, { state: `created`, uuid, created: undefined, elapsed: undefined, percentComplete: 0 });
            } else {
              self.app.io.emit(`jobEvent`, self.jobToJson(theJob));
            }
          }
        },
      },
    };

    const fsm = await StateMachine.create(fsmSettings);
    const stopwatch = await new Stopwatch(false, { refreshRateMS: 1000 });

    const jobObject = {
      id,
      uuid,
      fsm,
      stopwatch,
      fileUuid,
      botId,
      started: undefined,
      elapsed: undefined,
      percentComplete: 0,
    };

    stopwatch.onTime((time) => {
      this.app.io.emit('jobEvent', this.jobToJson(jobObject));
    });
    return jobObject;
  }

  async createPersistentJob(botId, uuid) {
    const jobObject = await this.createJobObject(botId, uuid);
    const jobJson = this.jobToJson(jobObject);
    const dbJob = await this.Job.create(jobJson);
    uuid = dbJob.dataValues.uuid;
    jobObject.id = dbJob.dataValues.id;
    this.jobList[uuid] = jobObject;
    this.app.io.emit('jobEvent', jobJson);
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
   * Turn a job object into a REST reply friendly object
   */
  jobToJson(job) {
    const state = job.fsm.current ? job.fsm.current : `created`;
    const started = !!job.started ? job.started : null;
    const elapsed = !!job.started ? job.stopwatch.ms || job.elapsed : null;
    return {
      botId: job.botId,
      uuid: job.uuid,
      state,
      fileUuid: job.fileUuid === undefined ? false : job.fileUuid,
      started,
      elapsed,
      percentComplete: job.percentComplete,
    };
  }

  /**
   * Turn an array of job objects into a REST reply friendly array of jobs
   */
  jobsToJson(jobs) {
    const jobObjects = {};
    for (let job in jobs) {
      jobObjects[job] = this.jobToJson(this.jobList[job]);
    }
    return jobObjects;
  }

  /**
   * A generic call to retreive a json friendly job by its uuid
   */
  getJob(jobUuid) {
    return this.jobToJson(this.jobList[jobUuid]);
  }

  /**
   * A generic call to retreive a json friendly list of jobs
   */
  getJobs() {
    const jobs = this.jobsToJson(this.jobList);
    return jobs;
  }

  /*
   * Start processing a job
   */
  async startJob(job) {
    try {
      await job.fsm.start();

      // Register conductor as a botId of -1
      if (Number(job.botId) === -1) {
        await this.app.context.conductor.startJob(job);
      } else {
        await this.app.context.bots.botList[job.botId].startJob(job);
      }
      job.started = new Date().getTime();
      await job.stopwatch.start();
      await job.fsm.startDone();
    } catch (ex) {
      await job.fsm.startFail();
      const errorMessage = `Job start failure ${ex}`;
      this.logger.error(errorMessage);
    }
  }

  /*
   * Pause processing a job
   */
  async pauseJob(job) {
    try {
      await job.fsm.pause();
      // Register conductor as a botId of -1
      if (Number(job.botId) === -1) {
        await this.app.context.conductor.pauseJob();
      } else {
        await this.app.context.bots.botList[job.botId].pauseJob();
      }
      await job.stopwatch.stop();
      await job.fsm.pauseDone();
    } catch (ex) {
      await job.fsm.pauseFail();
      const errorMessage = `Job pause failure ${ex}`;
      this.logger.error(errorMessage);
    }
  }

  /*
   * Resume processing a job
   */
  async resumeJob(job) {
    try {
      job.fsm.resume();
      // Register conductor as a botId of -1
      if (Number(job.botId) === -1) {
        await this.app.context.conductor.resumeJob();
      } else {
        await this.app.context.bots.botList[job.botId].resumeJob();
      }
      await job.stopwatch.start();
      job.fsm.resumeDone();
    } catch (ex) {
      job.fsm.resumeFail();
      const errorMessage = `Job resume failure ${ex}`;
      this.logger.error(errorMessage);
    }
  }

  /*
   * Stop processing a job
   */
  async cancelJob(job) {
    try {
      await job.fsm.cancel();
      // Register conductor as a botId of -1
      if (Number(job.botId) === -1) {
        await this.app.context.conductor.stopJob(job);
      } else {
        await this.app.context.bots.botList[job.botId].stopJob(job);
      }
      await job.stopwatch.stop();
      await job.fsm.cancelDone();
    } catch (ex) {
      const errorMessage = `Job stop failure ${ex}`;
      this.logger.error(errorMessage);
      await job.fsm.cancelFail();
    }
  }

  async deleteJob(jobUuid) {
    const theJob = this.jobList[jobUuid];
    const theJobJson = this.jobToJson(theJob);
    const dbJob = await this.Job.findById(theJob.id);
    this.app.io.emit('deleteJob', theJobJson);
    await dbJob.destroy();
    delete this.jobList[jobUuid];
    return `Job ${jobUuid} deleted`;
  }

  async setFile(job, file) {
    await job.fsm.setFile();
    try {
      job.fileUuid = file.uuid;
      const jobJson = this.jobToJson(job);
      await job.fsm.setFileDone();
      return jobJson;
    } catch (ex) {
      await job.fsm.setFileFail();
      throw ex;
    }
  }
}

module.exports = Jobs;
