const Promise = require(`bluebird`);
const LineByLineReader = Promise.promisifyAll(require(`line-by-line`));
const StateMachine = Promise.promisifyAll(require(`javascript-state-machine`));
const fs = require(`fs`);
const _ = require(`underscore`);

const SerialCommandExecutor = require(`./comProtocols/serial/executor`);
const HttpExecutor = require(`./comProtocols/http/executor`);
const VirtualExecutor = require(`./comProtocols/virtual/executor`);
const CommandQueue = require(`./commandQueue`);

const parkCommands = function parkCommands(that) {
  return {
    code:'M114',
    processData: (inCommand, inReply) => {
      const commandArray = [];

      let preParkLocation = {
        'X': Number(inReply.split('X:')[1].split('Y:')[0]),
        'Z': Number(inReply.split('Z:')[1].split('E:')[0]),
      };

      that.logger.info('preParkLocation ', preParkLocation );

      if (preParkLocation.Z < 18) {
        commandArray.push('G1 Y25 Z18 F3600');
      }
      commandArray.push('G1 Y2 F3600');
      commandArray.push('G92 E0');
      commandArray.push('G1 E-10 F1000');
      commandArray.push({
        postCallback: () => {
          that.fsm.parkDone();
        },
      });

      that.mQueue.queueCommands(commandArray);

      return true;
    },
  };
};

const unparkCommands = function unparkCommands(that, xEntry, dryJob) {
  const commandArray = [
    {
      code: 'M114',
      processData: (inCommand, inReply) => {
        const purgeArray = [];
        that.logger.info('Unparking: ', xEntry, '\t', dryJob);
        that.logger.info('xEntry Type: ', typeof(xEntry));
        that.logger.info('dry Type: ', typeof(dryJob));

        if (xEntry !== undefined) {
          that.logger.info('Unparking: Moving to entry X');
          purgeArray.push('G1 X' + xEntry + ' F3600');
        }
        if (dryJob.toLowerCase() === 'false'){
          that.logger.info('Unparking: Purging');

          purgeArray.push('G92 E-10');
          purgeArray.push('G1 E-2 F1000');
          purgeArray.push('G1 E0 F500');
          purgeArray.push('G1 E5 F200');
          purgeArray.push('G1 E4 F1800');
          purgeArray.push('G1 Y27 F3600');
        }
        commandArray.push({
          postCallback: () => {
            that.fsm.unparkDone();
          },
        });
        that.mQueue.queueCommands(purgeArray);
        return true;
      },
    },
  ];
  return commandArray;
};



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
        { name: 'park',               from: 'connected',          to: 'parking'            },
        { name: 'parkFail',           from: 'parking',            to: 'connected'          },
        { name: 'parkDone',           from: 'parking',            to: 'parked'             },
        { name: 'unpark',             from: 'parked',             to: 'unparking'          },
        { name: 'unparkFail',         from: 'unparking',          to: 'connected'          },
        { name: 'unparkDone',         from: 'unparking',          to: 'connected'          },
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
    switch (this.settings.connectionType) {
      case `http`:
      case `telnet`:
      case `virtual`:
        this.detect();
        break;
      default:
        // Do nothing
    }
    // if (this.settings.connectionType === `http` || this.settings.connectionType === `telnet`) {
    //   this.detect();
    // }
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
      settings: this.settings,
    };
  }

  async updateBot(newSettings) {
    const settingsToUpdate = {};
    for (const botSetting in this.settings) {
      if (this.settings.hasOwnProperty(botSetting)) {
        for (const newSetting in newSettings) {
          if (newSettings.hasOwnProperty(newSetting)) {
            if (botSetting === newSetting) {
              settingsToUpdate[newSetting] = newSettings[newSetting];
            }
          }
        }
      }
    }
    const dbBots = await this.app.context.bots.Bot.findAll();

    // The usb port is not a persistent value, while tcp and telnet ports are
    // Because of this, updating a usb port's settings should instead update the `null` port
    const thePort = this.settings.connectionType === `serial` ? `null` : this.settings.port;
    const dbBot = _.find(dbBots, (bot) => {
      return bot.dataValues.port === thePort;
    });
    await dbBot.update(settingsToUpdate);
    for (const newSetting in settingsToUpdate) {
      if (settingsToUpdate.hasOwnProperty(newSetting) && this.settings.hasOwnProperty(newSetting)) {
        this.settings[newSetting] = settingsToUpdate[newSetting];
      }
    }
    return settingsToUpdate;
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
      // Connect the bot via it's queue's executor
      case `connect`:
        this.connect();
        return this.getBot();

      // Disconnect the bot via it's queue's executor
      case `disconnect`:
        this.disconnect();
        return this.getBot();

      // Disconnect the bot via it's queue's executor
      case `park`:
        this.park();
        return this.getBot();

      // Disconnect the bot via it's queue's executor
      case `unpark`:
        this.unpark();
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
      let command = line.split(';')[0];
      if (command.length <= 0) {
        // If the line is blank, move on to the next line
        await self.lr.resume();
      } else {
        command = self.addOffset(command);
        command = self.addSpeedMultiplier(command);
        command = self.addFeedMultiplier(command);

        self.queue.queueCommands({
          code: command,
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

  // Set up the appropriate command executor and validator for a given connection type
  async detect() {
    await this.fsm.detect();
    try {
      let executor;
      let validator;
      // Set up the validator and executor
      switch (this.settings.connectionType) {
        case `serial`:
          const openPrime = 'M501';
          executor = new SerialCommandExecutor(
            this.settings.port,
            this.config.baudrate,
            openPrime,
            this.app.io
          );
          validator = this.validateSerialReply;
          break;
        case `http`:
          executor = new HttpExecutor(this.settings.port);
          validator = this.validateHttpReply;
          break;
        case `virtual`:
          executor = new VirtualExecutor(this.app.io);
          validator = this.validateSerialReply;
          break;
        default:
          const errorMessage = `connectionType "${this.settings.connectionType}" is not supported.`;
          throw errorMessage;
      }

      // Set up the bot's command queue
      this.queue = new CommandQueue(
        executor,
        this.expandCode,
        _.bind(validator, this)
      );

      await this.fsm.detectDone();
    } catch (ex) {
      this.logger.error(ex);
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

  async park() {
    try {
      this.fsm.park();
      this.queue.queueCommands(parkCommands(this));
      // this.queue.queueCommands({
      //   code: `G1 Z10`,
      //   postCallback: () => {
      //     this.fsm.parkDone();
      //   },
      // });
    } catch (ex) {
      this.fsm.parkFail();
    }
  }

  async unpark() {
    try {
      this.fsm.unpark();
      this.queue.queueCommands(unparkCommands(this));
      // this.queue.queueCommands({
      //   code: `G1 Z10`,
      //   postCallback: () => {
      //     this.fsm.unparkDone();
      //   },
      // });
    } catch (ex) {
      this.fsm.unparkFail();
    }
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
    return `${code}\n`;
  }

  /**
   * validateSerialReply()
   *
   * Confirms if a reply contains 'ok' as its last line.  Parses out DOS newlines.
   *
   * Args:   reply - The reply from a bot after sending a command
   * Return: true if the last line was 'ok'
   */
  validateSerialReply(command, reply) {
    const lines = reply.toString().split('\n');
    const ok = _.last(lines).indexOf(`ok`) !== -1;
    return ok;
  }

  /**
   * validateHttpReply()
   *
   * Confirms if a reply contains 'ok' as its last line.  Parses out DOS newlines.
   *
   * Args:   reply - The reply from a bot after sending a command
   * Return: true if the last line was 'ok'
   */
  validateHttpReply(command, reply) {
    return reply.status === 200;
  }

  /**
   * validateVirtualReply()
   *
   * Confirms if a reply contains 'ok' as its last line.  Parses out DOS newlines.
   *
   * Args:   reply - The reply from a bot after sending a command
   * Return: true if the last line was 'ok'
   */
  validateVirtualReply(command, reply) {
    const lines = reply.toString().split('\n');
    const ok = _.last(lines).indexOf(`ok`) !== -1;
    return ok;
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

  addOffset(command) {
    // const splitX = command.split('X');
    // if (splitX.length > 1) {
    //   let num = parseInt(splitX[1].split(' ')[0], 10);
    //   num += this.settings.offsetX;
    //   command = splitX[0] + num + ' ' + splitX[1].split(' ')[1];
    // }
    return command;
  }

  addSpeedMultiplier(command) {
    return command;
  }

  addFeedMultiplier(command) {
    return command;
  }
}

module.exports = Bot;
