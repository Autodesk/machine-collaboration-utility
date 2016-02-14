const router = require(`koa-router`)();
const uuid = require(`node-uuid`);
const Promise = require(`bluebird`);
const StateMachine = Promise.promisifyAll(require(`./stateMachine`));

const jobsRouter = require(`./routes`);

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
    this.jobs = [];
  }

  /**
   * initialize the jobs endpoint
   */
  async initialize() {
    try {
      await this.setupRouter();
      this.logger.info(`Jobs instance initialized`);
    } catch (ex) {
      this.logger.error(`Jobs initialization error`, ex);
    }
  }

  /**
   * Create a job object
   */
  async createJobObject(userUuid) {
    let jobObject;

    const cancelable = ['running', 'paused'];
    const id = userUuid ? userUuid : await uuid.v1();
    const fsm = {
      id,
      initial: 'created',
      error: (eventName, from, to, args, errorCode, errorMessage) => {
        const fsmError = `Invalid state change on event "${eventName}" from "${from}" to "${to}"\nargs: "${args}"\nerrorCode: "${errorCode}"\nerrorMessage: "${errorMessage}"`;
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
        { name: 'complete',    from: 'running',     to: 'complete'    },
        { name: 'cancel',      from: cancelable,    to: 'canceling'  },
        { name: 'cancelFail',  from: 'canceling',  to: 'canceled'    },
        { name: 'cancelDone',  from: 'canceling',  to: 'canceled'    },
        /* eslint-enable no-multi-spaces */
      ],
      callbacks: {
        onenterstate: (event, from, to) => {
          this.logger.info(`Job event ${event}: Transitioning from ${from} to ${to}.`);
          this.app.io.emit(`jobEvent`, { id, state: to });
        },
      },
    };

    jobObject = {
      id,
      fsm: await StateMachine.create(fsm),
      fileId: undefined,
    };

    // injecting the fsm callback after the fsm object is created to create a job reference within the socket event
    // jobObject.fsm.callbacks.onenterstate = (event, from, to) => {
    //   this.app.io.emit(`jobEvent`, jobObject);
    //   this.logger.info(`Job event ${event}: Transitioning from ${from} to ${to}.`);
    // };

    this.jobs.push(jobObject);
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
    return {
      id: job.id,
      state: job.fsm.current,
      fileId: job.fileId,
    };
  }

  /**
   * Turn an array of job objects into a REST reply friendly array of jobs
   */
  jobsToJson(jobs) {
    return jobs.map((job) => {
      return this.jobToJson(job);
    });
  }

  /**
   * A generic call to retreive a json friendly list of jobs
   */
  getJobs() {
    return this.jobsToJson(this.jobs);
  }

  /*
   * Start processing a job
   */
  async startJob(job) {
    try {
      job.fsm.start();
      await this.app.context.bot.startJob(job);
      job.fsm.startDone();
    } catch (ex) {
      job.fsm.startFail();
      const errorMessage = `Job start failure ${ex}`;
      this.logger.error(errorMessage);
    }
  }

  /*
   * Pause processing a job
   */
  async pauseJob(job) {
    try {
      const eventRes = job.fsm.pause();
      console.log('Event response:', eventRes);
      await this.app.context.bot.pauseJob();
      job.fsm.pauseDone();
    } catch (ex) {
      job.fsm.pauseFail();
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
      await this.app.context.bot.resumeJob();
      job.fsm.resumeDone();
    } catch (ex) {
      job.fsm.resumeFail();
      const errorMessage = `Job resyne failure ${ex}`;
      this.logger.error(errorMessage);
    }
  }

  /*
   * Stop processing a job
   */
  async cancelJob(job) {
    try {
      await job.fsm.cancel();
      await this.app.context.bot.stopJob(job);
      await job.fsm.cancelDone();
    } catch (ex) {
      const errorMessage = `Job stop failure ${ex}`;
      this.logger.error(errorMessage);
      await job.fsm.cancelFail();
    }
  }
}

module.exports = Jobs;
