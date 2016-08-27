const Promise = require('bluebird');
const LineByLineReader = Promise.promisifyAll(require('line-by-line'));
const fs = require('fs');
const _ = require('underscore');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');

const DefaultBot = function DefaultBot(app) {
  this.app = app;
  this.logger = app.context.logger;

  this.info = {
    connectionType: undefined,
    fileTypes: [],
  };

  this.settings = {
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
    name: `Default`,
    endpoint: false,
    jogXSpeed: `2000`,
    jogYSpeed: `2000`,
    jogZSpeed: `1000`,
    jogESpeed: `120`,
    tempE: `200`,
    tempB: `0`,
    speedRatio: `1.0`,
    eRatio: `1.0`,
    offsetX: `0`,
    offsetY: `0`,
    offsetZ: `0`,
  };

  this.commands = {};

  this.commands.initialize = bsync(function initialize() {});

  // In order to start processing a job, the job's file is opened and then
  // processed one line at a time
  this.commands.startJob = bsync(function startJob(self, params) {
    const job = params.job;
    self.currentJob = job;
    self.fsm.start();
    const filesApp = self.app.context.files;
    const theFile = filesApp.getFile(job.fileUuid);

    // open the file
    // start reading line by line...
    self.lr = new LineByLineReader(theFile.filePath);
    self.currentLine = 0;
    bwait(self.lr.pause()); // redundant

    self.lr.on('error', (err) => {
      self.logger.error('line reader error:', err);
    });

    // As the buffer reads each line, process it
    self.lr.on('line', bsync((line) => {
      // pause the line reader immediately
      // we will resume it as soon as the line is done processing
      bwait(self.lr.pause());
      // We only care about the info prior to the first semicolon
      // NOTE This code is assuming we are processing GCODE
      // In case of adding support for multiple contrl formats, this is a good place to start
      let command = line.split(';')[0];
      if (command.length <= 0) {
        // If the line is blank, move on to the next line
        bwait(self.lr.resume());
      } else {
        command = self.addOffset(command);
        command = self.addSpeedMultiplier(command);
        command = self.addFeedMultiplier(command);

        // Add an extra G4 P0 to pad the hydra-print buffer
        // TODO handle the summation of buffers here instead of on the composer side
        try {
          if (command.indexOf('G4 P1') !== -1) {
            self.queue.queueCommands({
              code: command,
            });
          }
        } catch (ex) {
          self.logger.error('The ole G4 snag', command);
        }
        self.queue.queueCommands({
          code: command,
          postCallback: bsync(() => {
            if (self.currentJob.fsm.current === `running`) {
              bwait(self.lr.resume());
            }
            self.currentLine += 1;
            self.currentJob.percentComplete = parseInt(self.currentLine / self.numLines * 100, 10);
          }),
        });
      }
    }));

    self.lr.on('end', bsync(() => {
      self.logger.info('completed reading file,', theFile.filePath, 'is closed now.');
      bwait(self.lr.close());
      self.queue.queueCommands({
        postCallback: bsync(() => {
          self.currentJob.percentComplete = 100;
          bwait(self.fsm.stop());
          bwait(self.fsm.stopDone());
          bwait(self.currentJob.fsm.runningDone());
          bwait(self.currentJob.stopwatch.stop());
          // Hack to keep conductor job transfer time low
          for (const [botKey, bot] of _.pairs(self.app.context.bots.botList)) {
            if (bot.settings.model.toLowerCase().indexOf(`conductor`) !== -1) {
              bwait(bot.commands.updateRoutine(self));
              bwait(Promise.delay(10));
              bwait(bot.commands.updateRoutine(self));
              bwait(Promise.delay(10));
              bwait(bot.commands.updateRoutine(self));
              bwait(Promise.delay(10));
              bwait(bot.commands.updateRoutine(self));
              bwait(Promise.delay(10));
              bwait(bot.commands.updateRoutine(self));
            }
          }
        }),
      });
    }));

    // Get the number of lines in the file
    let numLines = 0;
    const fsPromise = new Promise((resolve, reject) => {
      fs.createReadStream(theFile.filePath)
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

    bwait(fsPromise);
    self.lr.resume();
    self.fsm.startDone();
  });

    // Job pass through commands. These allow the bot to be a gateway for job commands
  this.commands.pauseJob = bsync(function pauseJob(self, params) {
    if (self.currentJob === undefined) {
      throw `Bot ${self.settings.name} is not currently processing a job`;
    }
    bwait(self.currentJob.pause(params));
    return self.getBot();
  });

  this.commands.resumeJob = bsync(function resumeJob(self, params) {
    if (self.currentJob === undefined) {
      throw `Bot ${self.settings.name} is not currently processing a job`;
    }
    bwait(self.currentJob.resume(params));
    return self.getBot();
  });

  this.commands.cancelJob = bsync(function cancelJob(self, params) {
    if (self.currentJob === undefined) {
      throw `Bot ${self.settings.name} is not currently processing a job`;
    }
    bwait(self.currentJob.cancel(params));
    return self.getBot();
  });
  // End of Job pass through commands

  this.commands.updateRoutine = function updateRoutine(self, params) {
    if (self.fsm.current === `connected`) {
      const commandArray = [];
      commandArray.push({
        code: `G4 P10`,
        processData: (command, reply) => {
          return true;
        },
      });
      self.queue.queueCommands(commandArray);
    }
  };

  this.commands.toggleUpdater = function toggleUpdater(self, params) {
    const update = params.update;
    if (update === undefined) {
      throw `"update" is not defined`;
    }
    if (update) {
      if (self.updateInterval === undefined) {
        self.updateInterval = setInterval(() => {
          self.commands.updateRoutine(self);
        }, 1000);
      }
      return `Bot update routine is on`;
    }
    if (self.updateInterval !== undefined) {
      clearInterval(self.updateInterval);
    }
    return `Bot update routine is off`;
  };

  // NOTE a try / catch on queueing commands will not actually fix an error
  // TODO attach an error handler to the about-to-be-queued command
  this.commands.connect = function connect(self, params) {
    self.fsm.connect();
    try {
      self.queue.queueCommands({
        open: true,
        postCallback: () => {
          self.commands.toggleUpdater(self, { update: true });
          self.fsm.connectDone();
        },
      });
    } catch (ex) {
      self.fsm.connectFail();
    }
    return self.getBot();
  };

  this.commands.disconnect = function disconnect(self, params) {
    self.fsm.disconnect();
    try {
      self.queue.queueCommands({
        close: true,
        postCallback: () => {
          self.fsm.disconnectDone();
        },
      });
    } catch (ex) {
      self.fsm.disconnectFail();
    }
    return self.getBot();
  };

  this.commands.unplug = function unplug(self, params) {
    self.fsm.unplug();
    if (self.currentJob) {
      try {
        self.currentJob.cancel();
      } catch (ex) {
        this.logger.error('job cancel error', ex);
      }
      self.currentJob = undefined;
    }
    return self.getBot();
  };

  this.commands.resume = function resume(self, params) {
    if (self.fsm.current === `parked`) {
      self.commands.unpark(self);
    }
    self.fsm.start();
    const commandArray = [];
    commandArray.push({
      postCallback: () => {
        self.lr.resume();
        self.fsm.startDone();
      },
    });
    self.queue.queueCommands(commandArray);
    self.queue.resume();
    return self.getBot();
  };

  this.commands.pause = function pause(self, params) {
    self.fsm.stop();
    const commandArray = [];
    commandArray.push({
      postCallback: () => {
        self.queue.pause();
        self.fsm.stopDone();
      },
    });
    self.queue.prependCommands(commandArray);
    return self.getBot();
  };

  this.commands.cancel = function cancel(self, params) {
    self.fsm.stop();
    const commandArray = [];
    commandArray.push({
      postCallback: () => {
        self.queue.pause();
        self.fsm.stopDone();
      },
    });
    self.queue.queueCommands(commandArray);
    return self.getBot();
  };

  this.commands.park = function park(self, params) {
    self.fsm.park();
    try {
      const commandArray = [];
      commandArray.push({
        postCallback: bsync(() => {
          bwait(Promise.delay(1000));
          bwait(self.fsm.parkDone());
        }),
      });
      self.queue.queueCommands(commandArray);
    } catch (ex) {
      self.fsm.parkFail();
    }
    return self.getBot();
  };

  this.commands.unpark = function unpark(self, params) {
    self.fsm.unpark();
    try {
      const commandArray = [];
      commandArray.push({
        postCallback: bsync(() => {
          bwait(Promise.delay(1000));
          bwait(self.fsm.unparkDone());
        }),
      });
      self.queue.queueCommands(commandArray);
    } catch (ex) {
      self.fsm.unparkFail();
    }
    return self.getBot();
  };

  this.commands.addSubscriber = function addSubscriber(self, params) {
    if (self.subscribers === undefined) {
      self.subscribers = [];
    }
    const subscriberEndpoint = params.subscriberEndpoint;
    let unique = true;
    for (const subscriber of self.subscribers) {
      if (subscriber === subscriberEndpoint) {
        unique = false;
      }
    }
    if (unique) {
      self.subscribers.push(subscriberEndpoint);
    }
    return self.getBot();
  };

  this.commands.updateState = function updateState(self, params) {
    const event = params.body.event;
    const bot = params.body.bot;

    const theEvent = self.fsmEvents.find((fsmEvent) => {
      return fsmEvent.name === event;
    });

    self.fsm.current = theEvent.from;
    self.fsm[theEvent.name]();
  };

  this.commands.checkSubscription = bsync(function checkSubscription(self, params) {
    bwait(self.subscribe());
  });
};

module.exports = DefaultBot;
