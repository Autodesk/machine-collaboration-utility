const router = require(`koa-router`)();
const uuid = require(`node-uuid`);
const Promise = require(`bluebird`);
const LineByLineReader = Promise.promisifyAll(require(`line-by-line`));
const StateMachine = Promise.promisifyAll(require(`javascript-state-machine`));
const fs = require(`fs`);
const SerialPort = require(`serialport`).SerialPort;
const FakeMarlin = require(`./fakeMarlin`);

const config = require(`../../config`);
const botRoutes = require(`./routes`);

/**
 * This is a Bot class representing hardware that can process jobs.
 */
class Bot {
  /**
   * A bot server class
   * @param {Object} app - The parent Koa app.
   * @param {string} routeEndpoint - The relative endpoint.
   */
  constructor(app, routeEndpoint) {
    app.context.bot = this; // External app reference variable

    this.app = app;
    this.logger = app.context.logger;
    this.routeEndpoint = routeEndpoint;
    this.router = router;
    this.virtual = false;
    this.fakePort = new FakeMarlin(app);
    this.currentJob = undefined;

    // File reading assets
    this.lr = undefined; // buffered file line reader
    this.currentLine = undefined;

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
      this.logger.info(`Bot instance initialized`);
    } catch (ex) {
      this.logger.error(`Bot initialization error`, ex);
    }
  }

  /*
   * get a json friendly description of the Bot
   */
  getBot() {
    return {
      state: this.fsm.current,
    };
  }

  async processCommand(command) {
    switch (command) {
      // Create a virtual bot
      // If the virtual bot is already created, just return the bot object
      case `createVirtualBot`:
        if (!this.virtual) {
          this.virtual = true;
          this.detect();
        }
        return this.getBot();
      case `destroyVirtualBot`:
        if (this.virtual) {
          await this.fsm.unplug();
          this.virtual = false;
        }
        return this.getBot();
      case `connect`:
        this.connect();
        return this.getBot();
      case `disconnect`:
        this.disconnect();
        return this.getBot();
      default:
        throw `Command "${command}" is not supported.`;
    }
  }

  async startJob(job) {
    this.currentJob = job;
    const self = this;
    await this.fsm.start();
    const filesApp = this.app.context.files;
    const theFile = filesApp.getFile(job.fileId);
    const filePath = filesApp.getFilePath(theFile);
    this.lr = new LineByLineReader(filePath);
    this.currentLine = 0;
    await this.lr.pause(); // redundant
    // open the file
    // start reading line by line...

    this.lr.on('error', (err) => {
      this.logger.error('line reader error:', err);
    });

    // As the buffer reads each line, process it
    this.lr.on('line', async (line) => {
      // pause the line reader immediately
      // we will resume it as soon as the line is done processing
      await self.lr.pause();
      self.currentLine += 1;

      // We only care about the info prior to the first semicolon
      const strippedLine = line.split(';')[0];

      if (strippedLine.length <= 0) {
        // If the line is blank, move on to the next line
        await self.lr.resume();
      } else {
        console.log('a line!', strippedLine);
        await self.fakePort.write(strippedLine);
        if (self.currentJob.fsm.current === `running`) {
          await self.lr.resume();
        }
      }
    });

    this.lr.on('end', async () => {
      await this.fsm.stop();
      await this.lr.close();
      this.logger.info('completed reading file,', filePath, 'is closed now.');
      await this.fsm.stopDone();
      await this.currentJob.fsm.complete();
      //
      // // Turn off the printer and put it into parked position
      // this.mQueue.queueCommands(this.mCompleteCommands(this));
      //
      // // Handle the job becoming completed
      // // Close the connection, clear the file buffer,
      // // and call the job 100% done, complete
      // if (this.mPersistentConnection) {
      //   this.mPercentComplete = 100;
      //   this.mQueue.clear();
      //   this.lr = undefined;
      //   this.printCompleted();
      // } else {
      //   this.mQueue.queueCommands({
      //     // cleanup!!!
      //     close: true,
      //     postCallback: () => {
      //       this.mPercentComplete = 100;
      //       this.mQueue.clear();
      //       this.lr = undefined;
      //       this.printCompleted();
      //     },
      //   });
      // }
    });

    // Get the number of lines in the file
    let numLines = 0;
    const fsPromise = new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
      .on('data', function readStreamOnData(chunk) {
        numLines += chunk
        .toString('utf8')
        .split(/\r\n|[\n\r\u0085\u2028\u2029]/g)
        .length - 1;
      })
      .on('end', () => {  // done
        self.numLines = numLines;
        console.log(`done reading, you have ${self.numLines} lines in this file`);
        resolve();
      });
    });

    await fsPromise;
    await this.lr.resume();
    await this.fsm.startDone();
  }

  async pauseJob(job) {
    if (this.fsm.current !== `connected`) {
      await this.fsm.stop();
      await this.lr.pause();
      await this.fsm.stopDone();
    }
  }

  async resumeJob(job) {
    if (this.fsm.current !== `processingJob`) {
      await this.fsm.start();
      await this.lr.resume();
      await this.fsm.startDone();
    }
  }

  async stopJob(job) {
    if (this.fsm.current !== `connected`) {
      await this.fsm.stop();
      await this.lr.close();
      this.lr = undefined;
      await this.fsm.stopDone();
    }
  }


  /**
   * Set up the bot's instance's router
   */
  async setupRouter() {
    try {
      // Populate this.router with all routes
      // Then register all routes with the app
      await botRoutes(this);

      // Register all router routes with the app
      this.app.use(this.router.routes()).use(this.router.allowedMethods());
      this.logger.info(`Bot router setup complete`);
    } catch (ex) {
      this.logger.error(`Bot router setup error`, ex);
    }
  }

  async detect() {
    this.fsm.detect();
    try {
      await Promise.delay(config.virtualDelay);
      this.fsm.detectDone();
    } catch (ex) {
      this.fsm.detectFail();
    }
  }

  async connect() {
    try {
      this.fsm.connect();
      if (this.virtual) {
        await Promise.delay(config.virtualDelay);
        await this.fsm.connectDone();
      } else {
        // TODO write connection logic here
        await Promise.delay(config.virtualDelay);
        await this.fsm.connectDone();
      }
    } catch (ex) {
      this.fsm.connectFail();
    }
  }

  async disconnect() {
    try {
      this.fsm.disconnect();
      if (this.virtual) {
        await Promise.delay(config.virtualDelay);
        await this.fsm.disconnectDone();
      } else {
        // TODO write disconnect logic here
        await Promise.delay(config.virtualDelay);
        await this.fsm.disconnectDone();
      }
    } catch (ex) {
      this.fsm.disconnectFail();
    }
  }
}

module.exports = Bot;
