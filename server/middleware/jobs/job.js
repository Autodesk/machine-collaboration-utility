const Promise = require(`bluebird`);
const uuidGenerator = require(`node-uuid`);
const StateMachine = require(`javascript-state-machine`);
const Stopwatch = require(`timer-stopwatch`);
const bsync = require(`asyncawait/async`);
const bwait = require(`asyncawait/await`);

const Job = function Job(app, botUuid, fileUuid, jobUuid, initialState, id, loud = true) {
  this.app = app;
  this.logger = this.app.context.logger;
  this.botUuid = botUuid;
  this.fileUuid = fileUuid;
  this.uuid = jobUuid;
  this.initialState = initialState;
  this.id = id;
  this.loud = loud;
};

Job.prototype.initialize = bsync(function initialize() {
  const self = this;

  // this.JobModel = await jobModel(this.app);
  if (this.botUuid === undefined) {
    throw `"botUuid" is not defined`;
  }

  const cancelable = [`running`, `paused`, `starting`, `pausing`, `resuming`];
  this.uuid = this.uuid !== undefined ? this.uuid : uuidGenerator.v1();
  const fsmSettings = {
    initial: self.initialState === undefined ? 'ready' : self.initialState,
    error: (eventName, from, to, args, errorCode, errorMessage) => {
      const fsmError = `Invalid job ${self.uuid} state change on event "${eventName}" from "${from}" to "${to}"\nargs: "${args}"\nerrorCode: "${errorCode}"\nerrorMessage: "${errorMessage}"`;
      self.logger.error(fsmError);
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
      onenterstate: bsync((event, from, to) => {
        if (self.loud) {
          self.logger.info(`Bot ${self.botUuid} Job ${self.uuid} event ${event}: Transitioning from ${from} to ${to}.`);
        }
        if (from !== `none`) {
          if (event.indexOf('Done') !== -1) {
            try {
              // As soon as an event successfully transistions, update it in the database
              if (self.loud) {
                console.log('updating job');
                const dbJob = bwait(self.JobModel.findById(self.id));
                bwait(Promise.delay(0)); // For some reason this can't happen in the same tick
                bwait(dbJob.updateAttributes({
                  state: self.fsm.current,
                  fileUuid: self.fileUuid,
                  started: self.started,
                  elapsed: self.stopwatch.ms,
                  percentComplete: self.percentComplete,
                }));
              }
              self.logger.info(`Job event. ${event} for job ${self.uuid} successfully updated to ${self.fsm.current}`);
            } catch (ex) {
              self.logger.info(`Job event ${event} for job ${self.uuid} failed to update: ${ex}`);
            }
          }
          if (self.loud) {
            self.logger.info(`jobEvent`, self.getJob());
            self.app.io.emit(`jobEvent`, {
              uuid: self.uuid,
              event: `update`,
              data: self.getJob(),
            });
          }
        }
      }),
    },
  };

  this.fsm = StateMachine.create(fsmSettings);
  this.stopwatch = new Stopwatch(false, { refreshRateMS: 1000 });
  this.started = undefined;
  this.elapsed = undefined;
  this.percentComplete = 0;

  // job updates once a second
  this.stopwatch.onTime(() => {
    if (self.loud) {
      this.logger.info('jobEvent', this.getJob());
      this.app.io.emit(`jobEvent`, {
        uuid: this.uuid,
        event: `update`,
        data: this.getJob(),
      });
    }
  });
});

Job.prototype.processCommand = bsync(function processCommand(command) {
  // populate this variable with the job (or the error)
  // immediately after the command is triggered
  let commandReply;
  switch (command) {
    case `start`:
      // TODO provide feedback if bot is unavailable, before starting the job
      bwait(this.start());
      commandReply = this.getJob();
      break;
    case `pause`:
      bwait(this.pause());
      commandReply = this.getJob();
      break;
    case `resume`:
      bwait(this.resume());
      commandReply = this.getJob();
      break;
    case `cancel`:
      bwait(this.cancel());
      commandReply = this.getJob();
      break;
    default:
      commandReply = `Command ${command} is not supported`;
      throw commandReply;
  }
  return commandReply;
});

/**
 * Turn a job object into a REST reply friendly object
 */
Job.prototype.getJob = function getJob() {
  const state = this.fsm.current ? this.fsm.current : `ready`;
  const started = !!this.started ? this.started : null;
  const elapsed = !!this.started ? this.stopwatch.ms || this.elapsed : null;
  return {
    botUuid: this.botUuid,
    uuid: this.uuid,
    state,
    fileUuid: this.fileUuid === undefined ? false : this.fileUuid,
    started,
    elapsed,
    percentComplete: this.percentComplete,
  };
};

/*
 * Start processing a job
 */
Job.prototype.start = bsync(function start() {
  this.fsm.start();
  const bot = this.app.context.bots.botList[this.botUuid];
  try {
    bwait(bot.processCommand(`startJob`, { job: this }));
    this.started = new Date().getTime();
    bwait(this.stopwatch.start());
    this.fsm.startDone();
  } catch (ex) {
    this.fsm.startFail();
    const errorMessage = `Job start failure ${ex}`;
    this.logger.error(errorMessage);
  }
});

/*
 * Pause processing a job
 */
Job.prototype.pause = bsync(function pause(params) {
  if (this.fsm.current === `paused`) {
    return;
  }
  this.fsm.pause();
  const bot = this.app.context.bots.botList[this.botUuid];
  try {
    bwait(bot.commands.pause(bot, params));
    bwait(this.stopwatch.stop());
    bwait(this.fsm.pauseDone());
  } catch (ex) {
    bwait(this.fsm.pauseFail());
    const errorMessage = `Job pause failure ${ex}`;
    this.logger.error(errorMessage);
  }
});

/*
 * Resume processing a job
 */
Job.prototype.resume = bsync(function resume(params) {
  if (this.fsm.current === `running`) {
    return;
  }
  this.fsm.resume();
  const bot = this.app.context.bots.botList[this.botUuid];
  try {
    bwait(bot.commands.resume(bot, params));
    bwait(this.stopwatch.start());
    this.fsm.resumeDone();
  } catch (ex) {
    this.fsm.resumeFail();
    const errorMessage = `Job resume failure ${ex}`;
    this.logger.error(errorMessage);
  }
});

/*
 * Stop processing a job
 */
Job.prototype.cancel = bsync(function cancel(params) {
  this.fsm.cancel();
  const bot = this.app.context.bots.botList[this.botUuid];
  try {
    try {
      bwait(bot.commands.cancel(bot, params));
    } catch (ex) {
      this.logger.error(`Bot can't be cancelled`, ex);
    }
    bwait(this.stopwatch.stop());
    bwait(this.fsm.cancelDone());
  } catch (ex) {
    const errorMessage = `Job stop failure ${ex}`;
    this.logger.error(errorMessage);
    bwait(this.fsm.cancelFail());
  }
});

module.exports = Job;
