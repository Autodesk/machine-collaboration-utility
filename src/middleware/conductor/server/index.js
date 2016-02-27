const router = require(`koa-router`)();
const Promise = require(`bluebird`);
const StateMachine = Promise.promisifyAll(require(`javascript-state-machine`));
const fs = require(`fs`);
const _ = require(`underscore`);
const request = require(`request-promise`);

const conductorRoutes = require(`./routes`);
/**
 * This is a Conductor class representing a system for managing multiple pieces of hardware
 *
 * The Conductor's state machine abstracts any job states (i.e. pause/resume/cancel)
 * to be handled by the Job API. In other words, in order to pause/resume/cancel the Conductor,
 * you must send that command to the job. This will pass down events accordingly to the Conductor
 *
 */
class Conductor {
  /**
   * A Conductor server class
   * @param {Object} app - The parent Koa app.
   * @param {string} routeEndpoint - The relative endpoint.
   */
  constructor(app, routeEndpoint) {
    app.context.conductor = this; // External app reference variable

    this.app = app;
    this.logger = app.context.logger;
    this.routeEndpoint = routeEndpoint;
    this.router = router;

    // File reading assets
    this.currentJob = undefined;

    this.fsm = StateMachine.create({
      initial: 'unavailable',
      error: (one, two) => {
        const errorMessage = `Invalid Conductor state change action "${one}". State at "${two}".`;
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
        { name: 'stop',               from: 'processingJob',   to: 'stopping'        },
        { name: 'stopDone',           from: 'stopping',        to: 'connected'       },
        { name: 'stopFail',           from: 'stopping',        to: 'connected'       },
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
          this.app.io.emit(`stateChange`, to);
          this.logger.info(`Bot event ${event}: Transitioning from ${from} to ${to}.`);
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
      await this.setupPlayersScanner();
      this.logger.info(`Conductor instance initialized`);
    } catch (ex) {
      this.logger.error(`Conductor initialization error`, ex);
    }
  }

  /*
   * get a json friendly description of the Conductor
   */
  getConductor() {
    return {
      state: this.fsm.current,
    };
  }

  /*
   * This is the logic for parsing any commands sent to the Conductor API
   * In all cases, the API does not wait for the command to be completed before
   * returning a reply to the requestor, instead the bot enters the appropriate
   * transitional state, followed by either "done" or "fail" events and
   * corresponding state transitions
   */
  async processCommand(command) {
    switch (command) {
      // Connect each player
      case `connect`:
        this.connect();
        return this.getConductor();

      // Disconnect the bot via it's queue's executor
      case `disconnect`:
        this.disconnect();
        return this.getConductor();

      // Throw out any bogus command requests
      default:
        const errorMessage = `Command "${command}" is not supported.`;
        throw errorMessage;
    }
  }

  // In order to start processing a job, the job's file is opened and then
  // processed one line at a time
  async startJob(job) {
    const self = this;

    self.currentJob = job;
    await self.fsm.start();
    const filesApp = self.app.context.files;
    const theFile = filesApp.getFile(job.fileUuid);
    const filePath = filesApp.getFilePath(theFile);
    // read the json metajob .... etc...
    await self.fsm.startDone();
  }

  async pauseJob() {
    if (this.fsm.current !== `connected`) { // TODO revisit this logic....
      try {
        await this.fsm.stop();
        // do the pause stuff here
        await this.fsm.stopDone();
      } catch (ex) {
        const errorMessage = `Bot pause error ${ex}`;
        this.logger.error(errorMessage);
        await this.fsm.stopFail();
      }
    }
  }

  async resumeJob() {
    if (this.fsm.current !== `processingJob`) {
      await this.fsm.start();
      // do the resume stuff here
      await this.fsm.startDone();
    }
  }

  async stopJob() {
    if (this.fsm.current !== `connected`) {
      await this.fsm.stop();
      // do the stop stuff here
      await this.fsm.stopDone();
    }
  }


  /**
   * Set up the conductor's instance's router
   */
  async setupRouter() {
    try {
      // Populate this.router with all routes
      // Then register all routes with the app
      await conductorRoutes(this);

      // Register all router routes with the app
      this.app.use(this.router.routes()).use(this.router.allowedMethods());
      this.logger.info(`Conductor router setup complete`);
    } catch (ex) {
      this.logger.error(`Conductor router setup error`, ex);
    }
  }

  async connect() {
    try {
      this.fsm.connect();
      // Do connect stuff here...
      this.fsm.connectDone();
    } catch (ex) {
      this.fsm.connectFail();
    }
  }

  async disconnect() {
    try {
      this.fsm.disconnect();
      // Do disconnect stuff here...
      this.fsm.disconnectDone();
    } catch (ex) {
      this.fsm.disconnectFail();
    }
  }

  async setupPlayersScanner() {
    const players = this.app.context.config.conductor.players;
    const scanInterval = setInterval(async () => {
      for (const player of players) {
        const requestParams = {
          method: `GET`,
          uri: `${player.url}/printers/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
          json: true,
        };
        const res = await request(requestParams);
        console.log('request reply', res);
      }
      if (false) {
        clearInterval(scanInterval);
      }
    }, 1000);
  }
}

module.exports = Conductor;
