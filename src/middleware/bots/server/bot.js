const Promise = require(`bluebird`);
const LineByLineReader = Promise.promisifyAll(require(`line-by-line`));
const StateMachine = Promise.promisifyAll(require(`javascript-state-machine`));
const fs = require(`fs`);
const _ = require(`underscore`);

// const SerialCommandExecutor = require(`./serialCommandExecutor`);
// const TCPExecutor = require(`./tcpCommandExecutor`);
// const FakeMarlinExecutor = require(`./fakeMarlinExecutor`);
const CommandQueue = require(`./commandQueue`);

/**
 * This is a Bot class representing hardware that can process jobs.
 * All commands to the bot are passed to it's queue and processed sequentially
 *
 * The bot's state machine abstracts any job states (i.e. pause/resume/cancel)
 * to be handled by the Job API. In other words, in order to pause/resume/cancel a bot,
 * you must send that command to the job. This will pass down events accordingly to the bot
 *
 */
class Bot {
  /**
   * A bot server class
   * @param {Object} app - The parent Koa app.
   * @param {string} settings - The settings, as retreived from the database.
   */
  constructor(app, settings) {
    app.context.bot = this; // External app reference variable

    this.app = app;
    this.config = app.context.config;
    this.logger = app.context.logger;

    this.virtual = false;
    this.queue = undefined;

    // File reading assets
    this.currentJob = undefined;
    this.lr = undefined; // buffered file line reader
    this.currentLine = undefined;

    this.stopCommands = [
      'G90',
      'G1 Z10',
      'G91',
      'M104 S0',
    ];

    this.fsm = StateMachine.create({
      initial: 'unavailable',
      error: (one, two) => {
        const errorMessage = `Invalid bot state change action "${one}". State at "${two}".`;
        this.logger.error(errorMessage);
        throw errorMessage;
      },
      events: [
        /* eslint-disable no-multi-spaces */
        { name: 'detect',             from: 'unavailable',        to: 'detecting'          },
        { name: 'detectFail',         from: 'detecting',          to: 'unavailable'        },
        { name: 'detectDone',         from: 'detecting',          to: 'ready'              },
        { name: 'connect',            from: 'ready',              to: 'connecting'         },
        { name: 'connectFail',        from: 'connecting',         to: 'ready'              },
        { name: 'connectDone',        from: 'connecting',         to: 'connected'          },
        { name: 'start',              from: 'connected',          to: 'startingJob'        },
        { name: 'startFail',          from: 'startingJob',        to: 'connected'          },
        { name: 'startDone',          from: 'startingJob',        to: 'processingJob'      },
        { name: 'stop',               from: 'processingJob',      to: 'stopping'           },
        { name: 'stopDone',           from: 'stopping',           to: 'connected'          },
        { name: 'stopFail',           from: 'stopping',           to: 'connected'          },
        { name: 'jobToGcode',         from: 'processingJob',      to: 'processingJobGcode' },
        { name: 'jobGcodeFail',       from: 'processingJobGcode', to: 'processingJob'      },
        { name: 'jobGcodeDone',       from: 'processingGcode',    to: 'processingJob'      },
        { name: 'connectedToGcode',   from: 'connected',          to: 'processingGcode'    },
        { name: 'connectedGcodeFail', from: 'processingGcode',    to: 'connected'          },
        { name: 'connectedGcodeDone', from: 'processingGcode',    to: 'connected'          },
        { name: 'disconnect',         from: 'connected',          to: 'disconnecting'      },
        { name: 'disconnectFail',     from: 'disconnecting',      to: 'connected'          },
        { name: 'disconnectDone',     from: 'disconnecting',      to: 'ready'              },
        { name: 'unplug',             from: '*',                  to: 'unavailable'        },
        /* eslint-enable no-multi-spaces */
      ],
      callbacks: {
        onenterstate: (event, from, to) => {
          this.app.io.emit(`stateChange`, to);
          this.logger.info(`Bot event ${event}: Transitioning from ${from} to ${to}.`);
        },
      },
    });

    this.settings = settings;
  }

  async processGcode(gcode) {
    const state = this.fsm.current;
    switch (state) {
      case `connected`:
      case `processingJob`:
      case `processingJobGcode`:
      case `processingGcode`:
        this.queue.queueCommands(gcode);
        return true;
      default:
        return undefined;
    }
  }

  async streamGcode(gcode) {
    const state = this.fsm.current;
    switch (state) {
      case `connected`:
      case `processingJob`:
      case `processingJobGcode`:
      case `processingGcode`:
        if (this.queue.mQueue.length < 32) {
          this.queue.queueCommands(gcode);
          return true;
        }
        return false; // `Command Queue is full. Please try again later`;
      default:
        return undefined;
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

  /*
   * Set the port of the bot. This is only necessary for usb printers
   */
  setPort(port) {
    this.settings.port = port;
  }

  /*
   * This is the logic for parsing any commands sent to the Bot API
   * In all cases, the API does not wait for the command to be completed, instead
   * the bot enters the appropriate transitional state, followed by either
   * "done" or "fail" events and corresponding state transitions
   */
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

      // Destroy a virtual bot
      // If the virtual bot doesn't exist, just return the bot object
      case `destroyVirtualBot`:
        if (this.virtual) {
          await this.unplug();
          this.virtual = false;
        }
        return this.getBot();

      // Connect the bot via it's queue's executor
      case `connect`:
        this.connect();
        return this.getBot();

      // Disconnect the bot via it's queue's executor
      case `disconnect`:
        this.disconnect();
        return this.getBot();

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
    self.lr = new LineByLineReader(filePath);
    self.currentLine = 0;
    await self.lr.pause(); // redundant
    // open the file
    // start reading line by line...

    self.lr.on('error', (err) => {
      self.logger.error('line reader error:', err);
    });

    // As the buffer reads each line, process it
    self.lr.on('line', async (line) => {
      // pause the line reader immediately
      // we will resume it as soon as the line is done processing
      await self.lr.pause();

      // We only care about the info prior to the first semicolon
      const strippedLine = line.split(';')[0];

      if (strippedLine.length <= 0) {
        // If the line is blank, move on to the next line
        await self.lr.resume();
      } else {
        self.queue.queueCommands({
          code: strippedLine,
          postCallback: () => {
            self.currentLine += 1;
            self.currentJob.percentComplete = parseInt(self.currentLine / self.numLines * 100, 10);
          },
        });
        // await self.fakePort.write(strippedLine);
        if (self.currentJob.fsm.current === `running`) {
          await self.lr.resume();
        }
      }
    });

    self.lr.on('end', async () => {
      self.logger.info('completed reading file,', filePath, 'is closed now.');
      await self.lr.close();
      self.queue.queueCommands({
        postCallback: async() => {
          self.currentJob.percentComplete = 100;
          await self.fsm.stop();
          await self.fsm.stopDone();
          await self.currentJob.fsm.runningDone();
          await self.currentJob.stopwatch.stop();
        },
      });
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
        self.logger.info(`Bot will process file with ${self.numLines} lines.`);
        resolve();
      });
    });

    await fsPromise;
    await self.lr.resume();
    await self.fsm.startDone();
  }

  async pauseJob() {
    if (this.fsm.current !== `connected`) {
      try {
        await this.fsm.stop();
        await this.queue.pause();
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
      await this.queue.resume();
      await this.lr.resume();
      await this.fsm.startDone();
    }
  }

  async stopJob() {
    if (this.fsm.current !== `connected`) {
      await this.fsm.stop();
      await this.lr.close();
      this.lr = undefined;
      this.queue.clear();
      this.queue.queueCommands(this.stopCommands);
      await this.fsm.stopDone();
    }
  }

// TODO create a generic 'EXECUTOR' object associated with a Bot object
  async detect(device) {
    await this.fsm.detect();
    try {
      if (this.virtual) {
        this.queue = new CommandQueue(
          new FakeMarlinExecutor(this.app.io),
          this.expandCode,
          _.bind(this.validateReply, this)
        );
      // } else if (this.externalEndpoint) {
      //   this.queue = new CommandQueue(
      //     this.setupTCPExecutor(this.externalEndpoint),
      //     this.expandCode,
      //     this.validateTCPReply
      //   );
      } else {
        this.queue = new CommandQueue(
          this.setupSerialExecutor(this.port, this.config.baudrate),
          this.expandCode,
          _.bind(this.validateReply, this)
        );
      }
      await this.fsm.detectDone();
    } catch (ex) {
      await this.fsm.detectFail();
    }
  }

  async unplug() {
    this.device = undefined;
    await this.fsm.unplug();
  }

  async connect() {
    try {
      this.fsm.connect();
      this.queue.queueCommands({
        open: true,
        postCallback: () => {
          this.fsm.connectDone();
        },
      });
    } catch (ex) {
      this.fsm.connectFail();
    }
  }

  async disconnect() {
    try {
      this.fsm.disconnect();
      this.queue.queueCommands({
        close: true,
        postCallback: () => {
          this.fsm.disconnectDone();
        },
      });
    } catch (ex) {
      this.fsm.disconnectFail();
    }
  }

  setupSerialExecutor(port, baudrate) {
    const openPrime = 'M501';
    // return new SerialCommandExecutor(
    //   port,
    //   baudrate,
    //   openPrime,
    //   this.app.io
    // );
  }

  setupTCPExecutor(externalEndpoint) {
    // return new TCPExecutor(externalEndpoint);
  }

  /**
   * expandCode()
   *
   * Expand simple commands to gcode we can send to the bot
   *
   * Args:   code - a simple string gcode command
   * Return: a gcode string suitable for the hardware
   */
  expandCode(code) {
    // TODO consider adding checksumming
    return `${code}\n`;
  }

  /**
   * validateReply()
   *
   * Confirms if a reply contains 'ok' as its last line.  Parses out DOS newlines.
   *
   * Args:   reply - The reply from a bot after sending a command
   * Return: true if the last line was 'ok'
   */
  validateReply(command, reply) {
    const lines = reply.toString().split('\n');
    const ok = _.last(lines).indexOf(`ok`) !== -1;
    // this.app.io.emit(`botReply`, lines);
    return ok;
  }

  /**
   * validateReply()
   *
   * Confirms if a reply contains 'ok' as its last line.  Parses out DOS newlines.
   *
   * Args:   reply - The reply from a bot after sending a command
   * Return: true if the last line was 'ok'
   */
  validateTCPReply(command, reply) {
    this.logger.info('oooh what a hack', command, reply);
    return true;
  }

  async jog(gcode) {
    const state = this.fsm.current;
    switch (state) {
      case `connected`:
      case `processingJob`:
      case `processingJobGcode`:
      case `processingGcode`:
        this.queue.queueCommands({
          code: `G91`,
          postCallback: () => {
            this.queue.prependCommands([
              gcode,
              `G90`,
            ]);
          },
        });
        return true;
      default:
        return undefined;
    }
  }
}

module.exports = Bot;
