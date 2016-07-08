const Promise = require(`bluebird`);
const uuidGenerator = require(`node-uuid`);
const StateMachine = require(`./stateMachine`);
const Stopwatch = require(`timer-stopwatch`);
const jobModel = require(`./model`);

class Job {
  constructor(app, botId, fileUuid, jobUuid, initialState, id) {
    this.app = app;
    this.logger = this.app.context.logger;
    this.botId = botId;
    this.fileUuid = fileUuid;
    this.uuid = jobUuid;
    this.initialState = initialState;
    this.id = id;
    this.JobModel = jobModel(this.app);
  }

  async initialize() {
    const self = this;
    if (this.botId === undefined) {
      throw `botId is not defined`;
    }

    const cancelable = ['running', 'paused'];
    this.uuid = this.uuid !== undefined ? this.uuid : uuidGenerator.v1();
    const fsmSettings = {
      uuid: this.uuid,
      initial: this.initialState === undefined ? 'ready' : this.initialState,
      error: (eventName, from, to, args, errorCode, errorMessage) => {
        const fsmError = `Invalid job ${this.uuid} state change on event "${eventName}" from "${from}" to "${to}"\nargs: "${args}"\nerrorCode: "${errorCode}"\nerrorMessage: "${errorMessage}"`;
        this.logger.error(fsmError);
        throw fsmError;
      },
      events: [
        /* eslint-disable no-multi-spaces */
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
          self.logger.info(`Bot ${self.botId} Job ${self.uuid} event ${event}: Transitioning from ${from} to ${to}.`);
          if (from !== `none`) {
            if (event.indexOf('Done') !== -1) {
              try {
                // As soon as an event successfully transistions, update it in the database
                const dbJob = await self.JobModel.findById(self.id);
                await Promise.delay(0); // For some reason this can't happen in the same tick
                await dbJob.updateAttributes({
                  state: self.fsm.current,
                  fileUuid: self.fileUuid,
                  started: self.started,
                  elapsed: self.stopwatch.ms,
                  percentComplete: self.percentComplete,
                });
                self.logger.info(`Job event. ${event} for job ${self.uuid} successfully updated to ${self.fsm.current}`);
              } catch (ex) {
                self.logger.info(`Job event ${event} for job ${self.uuid} failed to update: ${ex}`);
              }
            }
            self.logger.info(`jobEvent`, self.getJob());
            // self.app.io.emit(`jobEvent`, `derp`);
          }
        },
      },
    };

    this.fsm = await StateMachine.create(fsmSettings);
    this.stopwatch = new Stopwatch(false, { refreshRateMS: 1000 });
    this.started = undefined;
    this.elapsed = undefined;
    this.percentComplete = 0;

    this.stopwatch.onTime((time) => {
      this.logger.info('jobEvent', this.getJob());
      // this.app.io.emit('jobEvent', this.jobToJson(jobObject));
    });
  }

  processCommand(command) {
    // populate this variable with the job (or the error)
    // immediately after the command is triggered
    let commandReply;
    switch (command) {
      case `start`:
        // TODO provide feedback if bot is unavailable, before starting the job
        this.start();
        commandReply = this.getJob();
        break;
      case `pause`:
        this.pause();
        commandReply = this.getJob();
        break;
      case `resume`:
        this.resume();
        commandReply = this.getJob();
        break;
      case `cancel`:
        this.cancel();
        commandReply = this.getJob();
        break;
      default:
        commandReply = `Command ${command} is not supported`;
        throw commandReply;
    }
    return commandReply;
  }

  /**
   * Turn a job object into a REST reply friendly object
   */
  getJob() {
    const state = this.fsm.current ? this.fsm.current : `ready`;
    const started = !!this.started ? this.started : null;
    const elapsed = !!this.started ? this.stopwatch.ms || this.elapsed : null;
    return {
      botId: this.botId,
      uuid: this.uuid,
      state,
      fileUuid: this.fileUuid === undefined ? false : this.fileUuid,
      started,
      elapsed,
      percentComplete: this.percentComplete,
    };
  }

  /*
   * Start processing a job
   */
  async start() {
    try {
      await this.fsm.start();

      // Register conductor as a botId of -1
      if (Number(this.botId) === -1) {
        await this.app.context.conductor.startJob(this);
      } else {
        try {
          await this.app.context.bots.botList[this.botUuid].startJob(this);
        } catch (ex) {
          console.log('ooooh', ex);
        }
      }
      this.started = new Date().getTime();
      await this.stopwatch.start();
      await this.fsm.startDone();
    } catch (ex) {
      await this.fsm.startFail();
      const errorMessage = `Job start failure ${ex}`;
      this.logger.error(errorMessage);
    }
  }

  /*
   * Pause processing a job
   */
  async pause() {
    try {
      await this.fsm.pause();
      // Register conductor as a botId of -1
      if (Number(this.botId) === -1) {
        await this.app.context.conductor.pauseJob(this);
      } else {
        await this.app.context.bots.botList[this.botId].pauseJob();
      }
      await this.stopwatch.stop();
      await this.fsm.pauseDone();
    } catch (ex) {
      await this.fsm.pauseFail();
      const errorMessage = `Job pause failure ${ex}`;
      this.logger.error(errorMessage);
    }
  }

  /*
   * Resume processing a job
   */
  async resume() {
    try {
      this.fsm.resume();
      // Register conductor as a botId of -1
      if (Number(this.botId) === -1) {
        await this.app.context.conductor.resumeJob(this);
      } else {
        await this.app.context.bots.botList[this.botId].resumeJob(this);
      }
      await this.stopwatch.start();
      this.fsm.resumeDone();
    } catch (ex) {
      this.fsm.resumeFail();
      const errorMessage = `Job resume failure ${ex}`;
      this.logger.error(errorMessage);
    }
  }

  /*
   * Stop processing a job
   */
  async cancel() {
    try {
      await this.fsm.cancel();
      // Register conductor as a botId of -1
      if (Number(this.botId) === -1) {
        await this.app.context.conductor.stopJob(this);
      } else {
        await this.app.context.bots.botList[this.botId].stopJob(this);
      }
      await this.stopwatch.stop();
      await this.fsm.cancelDone();
    } catch (ex) {
      const errorMessage = `Job stop failure ${ex}`;
      this.logger.error(errorMessage);
      await this.fsm.cancelFail();
    }
  }
}

module.exports = Job;
