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
    this.app = app;
    this.logger = app.context.logger;
    this.routeEndpoint = routeEndpoint;
    this.router = router;
    this.jobs = [];

    const pauseable = ['running', 'paused'];
    const cancelable = ['running', 'paused', 'connected'];
    this.fsm = {
      initial: 'created',
      error: (one, two, three) => {
        throw `invalid state change ${one} ${two} ${three}`;
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
          console.log(`Job event ${event}: Transitioning from ${from} to ${to}.`);
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
}

module.exports = Jobs;
