const router = require(`koa-router`)();
const uuid = require(`node-uuid`);
const Promise = require(`bluebird`);
const StateMachine = Promise.promisifyAll(require(`javascript-state-machine`));

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

    const pauseable = ['running', 'paused'];
    const cancelable = ['running', 'paused'];
    this.fsm = {
      initial: 'created',
      error: (one, two) => {
        const errorMessage = `Invalid state change action "${one}". State at "${two}".`;
        this.logger.error(errorMessage);
        throw errorMessage;
      },
      events: [
        /* eslint-disable no-multi-spaces */
        { name: 'setFile',     from: 'created',     to: 'settingFile' },
        { name: 'setFileFail', from: 'settingFile', to: 'created'     },
        { name: 'setFileDone', from: 'settingFile', to: 'ready'       },
        { name: 'start',       from: 'ready',       to: 'starting'    },
        { name: 'startFail',   from: 'starting',    to: 'ready'       },
        { name: 'startDone',   from: 'starting',    to: 'running'     },
        { name: 'pause',       from: pauseable,     to: 'pausing'     },
        { name: 'pauseFail',   from: 'pausing',     to: 'running'     },
        { name: 'pauseDone',   from: 'pausing',     to: 'paused'      },
        { name: 'resume',      from: pauseable,     to: 'resuming'    },
        { name: 'resumeFail',  from: 'resuming',    to: 'paused'      },
        { name: 'resumeDone',  from: 'resuming',    to: 'running'     },
        { name: 'complete',    from: 'running',     to: 'complete'    },
        { name: 'cancel',      from: cancelable,    to: 'canceled'    },
        /* eslint-enable no-multi-spaces */
      ],
      callbacks: {
        onenterstate: (event, from, to) => {
          this.logger.info(`Job event ${event}: Transitioning from ${from} to ${to}.`);
        },
      },
    };
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
    const jobObject = {
      id: userUuid ? userUuid : await uuid.v1(),
      fsm: await StateMachine.create(this.fsm),
      fileId: undefined,
    };
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
}

module.exports = Jobs;
