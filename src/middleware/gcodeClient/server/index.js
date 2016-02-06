const router = require(`koa-router`)();
const uuid = require(`node-uuid`);
const Promise = require(`bluebird`);
const StateMachine = Promise.promisifyAll(require(`javascript-state-machine`));

const gcodeClientRoutes = require(`./routes`);

/**
 * This is a Machine class.
 */
class GcodeClient {
  /**
   * A GcodeClient server class
   * @param {Object} app - The parent Koa app.
   * @param {string} routeEndpoint - The relative endpoint.
   */
  constructor(app, routeEndpoint) {
    app.context.gcodeClient = this; // External app reference variable

    this.app = app;
    this.logger = app.context.logger;
    this.routeEndpoint = routeEndpoint;
    this.router = router;
    this.virtual = false;
    this.fsm = StateMachine.create({
      initial: 'unavailable',
      error: (one, two) => {
        const errorMessage = `Invalid state change action "${one}". State at "${two}".`;
        this.logger.error(errorMessage);
        throw errorMessage;
      },
      events: [
        /* eslint-disable no-multi-spaces */
        { name: 'detect',             from: 'unavailable',     to: 'detecting'       },
        { name: 'detectFail',         from: 'detecting',       to: 'unavailable'     },
        { name: 'detectDone',         from: 'detecting',       to: 'ready'           },
        { name: 'connect',            from: 'ready',           to: 'connecting'      },
        { name: 'connectFail',        from: 'connecting',      to: 'ready'           },
        { name: 'connectDone',        from: 'connecting',      to: 'connected'       },
        { name: 'start',              from: 'connected',       to: 'startingJob'     },
        { name: 'startFail',          from: 'startingJob',     to: 'connected'       },
        { name: 'startDone',          from: 'startingJob',     to: 'processingJob'   },
        { name: 'stop',               from: 'processingJob',   to: 'connected'       },
        { name: 'jobToGcode',         from: 'processingJob',   to: 'processingGcode' },
        { name: 'jobGcodeFail',       from: 'processingGcode', to: 'processingJob'   },
        { name: 'jobGcodeDone',       from: 'processingGcode', to: 'processingJob'   },
        { name: 'connectedToGcode',   from: 'connected',       to: 'processingGcode' },
        { name: 'connectedGcodeFail', from: 'processingGcode', to: 'connected'       },
        { name: 'connectedGcodeDone', from: 'processingGcode', to: 'connected'       },
        { name: 'disconnect',         from: 'connected',       to: 'disconnecting'   },
        { name: 'disconnectFail',     from: 'disconnecting',   to: 'connected'       },
        { name: 'disconnectDone',     from: 'disconnecting',   to: 'ready'           },
        { name: 'unplug',             from: '*',               to: 'unavailable'     },
        /* eslint-enable no-multi-spaces */
      ],
      callbacks: {
        onenterstate: (event, from, to) => {
          this.logger.info(`GCode Client event ${event}: Transitioning from ${from} to ${to}.`);
        },
      },
    });
  }

  /**
   * initialize the jobs endpoint
   */
  async initialize() {
    try {
      await this.setupRouter();
      this.logger.info(`Gcode Client instance initialized`);
    } catch (ex) {
      this.logger.error(`Gcode Client initialization error`, ex);
    }
  }

  /*
   * get a json friendly description of the Gcode Client
   */
  getGcodeClient() {
    return {
      state: this.fsm.current,
    };
  }

  async processCommand(command) {
    switch (command) {
      case `createVirtualClient`:
        await this.fsm.unplug();
        this.virtual = true;
        await this.fsm.detect();
        await this.fsm.detectDone();
        return this.getGcodeClient();
      case `destroyVirtualClient`:
        if (this.virtual) {
          await this.fsm.unplug();
          this.virtual = false;
        } else {
          throw `No virtual client available to destroy`;
        }
        return this.getGcodeClient();
      case `connect`:
        if (this.virtual) {
          await this.fsm.connect();
          await this.fsm.connectDone();
        } else {
          throw `Command only supported for virtual gcode client`;
        }
        return this.getGcodeClient();
      case `disconnect`:
        if (this.virtual) {
          await this.fsm.disconnect();
          await this.fsm.disconnectDone();
        } else {
          throw `Command only supported for virtual gcode client`;
        }
        return this.getGcodeClient();
      default:
        throw `Command "${command}" is not supported.`;
    }
  }

  async startJob() {
    await this.fsm.start();
    await this.fsm.startDone();
    await Promise.delay(2000);
  }

  /**
   * Set up the client's instance's router
   */
  async setupRouter() {
    try {
      // Populate this.router with all routes
      // Then register all routes with the app
      await gcodeClientRoutes(this);

      // Register all router routes with the app
      this.app.use(this.router.routes()).use(this.router.allowedMethods());
      this.logger.info(`Gcode Client router setup complete`);
    } catch (ex) {
      this.logger.error(`Gcode Client router setup error`, ex);
    }
  }
}

module.exports = GcodeClient;
