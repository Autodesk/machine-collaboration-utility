const _ = require('underscore');
const Promise = require('bluebird');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');
const winston = require('winston');
const path = require('path');
const request = require('request-promise');
const Marlin = require('./Marlin');
const LineByLineReader = Promise.promisifyAll(require('line-by-line'));
const fs = require('fs');

const SmoothieBoard = function SmoothieBoard(app) {
  Marlin.call(this, app);

  _.extend(this.settings, {
    name: 'SmoothieBoard',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  this.serialLogger = undefined;
  // Set up serial logger
  if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
    // Set up logging for written serial data
    const serialLogName = path.join(__dirname, `../../${this.settings.name}-verbose-serial.log`);
    this.serialLogger = new (winston.Logger)({
      levels: { write: 0, read: 1, info: 2 },
      transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename: serialLogName }),
      ],
    });
    this.serialLogger.info('started logging');
  }


  _.extend(this.info, {
    vidPid: [
      {
        vid: 0x1D50,
        pid: 0x6015,
      },
    ],
    baudrate: 230400,
  });

  _.extend(this.commands, {
    processGcode: bsync((self, params) => {
      const gcode = self.addOffset(params.gcode);
      if (gcode === undefined) {
        throw '"gcode" is undefined';
      }
      const commandArray = [];

      return bwait(new Promise((resolve, reject) => {
        commandArray.push(self.commands.gcodeInitialState(self, params));
        commandArray.push({
          code: gcode,
          processData: (command, reply) => {
            resolve(reply.replace('\r', ''));
            return true;
          },
        });
        commandArray.push(self.commands.gcodeFinalState(self, params));

        self.queue.queueCommands(commandArray);
      }));
    }),
    startJob: bsync(function startJob(self, params) {
      const job = params.job;
      self.currentJob = job;
      self.currentJob.checkpoint = null;
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
        try {
          if (process.env.VERBOSE_SERIAL_LOGGING) {
            self.serialLogger.info('About to process line', line);
          }
          // pause the line reader immediately
          // we will resume it as soon as the line is done processing
          bwait(self.lr.pause());
          // We only care about the info prior to the first semicolon
          // NOTE This code is assuming we are processing GCODE
          // In case of adding support for multiple control formats, this is a good place to start

          // Looking for a comment between 3 brackets and whatever comes after that
          const conductorComment = /^[\w\d\s]*; <<<(\w+)>>> (.*)$/;
          const conductorCommentResult = conductorComment.exec(line);
          if (conductorCommentResult !== null) {
            switch (conductorCommentResult[1]) {
              case 'PARK': {
                self.command.park(self);
                break;
              }
              case 'UNPARK': {
                self.commands.unpark(self);
                break;
              }
              case 'CHECKPOINT': {
                const botRegex = /^.*bot(\w+) : (\d+)$/;
                const botAndCheckpoint = botRegex.exec(conductorCommentResult[2]);
                const bot = botAndCheckpoint[1];
                const checkpoint = parseInt(botAndCheckpoint[2], 10);
                self.status.checkpoint = parseInt(checkpoint, 10);
                self.logger.info(`Bot ${bot} just reached checkpoint ${checkpoint}`);
                if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
                  self.serialLogger.info(`Bot ${bot} just reached checkpoint ${checkpoint}`);
                }
                self.lr.resume();

                if (Array.isArray(self.currentJob.subscribers)) {
                  for (const subscriber of self.currentJob.subscribers) {
                    try {
                      const updateParams = {
                        method: 'POST',
                        uri: subscriber,
                        body: {
                          command: 'updateCollaborativeBotCheckpoint',
                          bot: self.settings.name,
                          checkpoint: self.status.checkpoint,
                        },
                        json: true,
                      };
                      try {
                        request(updateParams);
                      } catch (ex) {
                        self.logger.error('Conductor update fail', ex);
                      }
                    } catch (ex) {
                      this.logger.error(`Failed to update endpoint "${subscriber}": ${ex}`);
                    }
                  }
                }
                // Let conductor know that you've reached the latest checkpoint
                // Check if precursors are complete
                break;
              }
              case 'PRECURSOR': {
                const botRegex = /^.*(bot\w+) : (\d+)$/;
                const botAndCheckpoint = botRegex.exec(conductorCommentResult[2]);
                const bot = botAndCheckpoint[1];
                const checkpoint = parseInt(botAndCheckpoint[2], 10);
                self.status.blocker = { bot, checkpoint };
                self.logger.info(`Just set blocker to bot ${bot}, checkpoint ${checkpoint}`);
                if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
                  self.serialLogger.info(`Just set blocker to bot ${bot}, checkpoint ${checkpoint}`);
                }
                self.commands.checkPrecursors(self);
                break;
              }
              case 'DRY': {
                if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
                  self.serialLogger.info('Just received a "dry" metacommand', self.fsm.current, JSON.stringify(conductorCommentResult));
                }

                const dry = conductorCommentResult[2].toLowerCase() === 'true';

                // If the printer is currently parked, then purge and unpark it
                self.queue.queueCommands({
                  code: 'M400',
                  postCallback: () => {
                    if (self.fsm.current === 'parkedJob') {
                      self.commands.unpark(self, { dry });
                    }
                    self.lr.resume();
                  },
                });
                break;
              }
              default: {
                self.logger.error('Unknown comment', conductorCommentResult);
                break;
              }
            }
          } else {
            let command = line.split(';')[0];
            if (command.length <= 0) {
              // If the line is blank, move on to the next line
              if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
                self.serialLogger.info('Passed on parsing a blank line', line);
              }
              bwait(self.lr.resume());
            } else {
              const commandArray = [];
              command = self.addOffset(command);
              command = self.addSpeedMultiplier(command);
              command = self.addFeedMultiplier(command);
              commandArray.push({
                code: command,
                postCallback: bsync(() => {
                  if (self.currentJob.fsm.current === 'running') {
                    bwait(self.lr.resume());
                  }
                  self.currentLine += 1;
                  self.currentJob.percentComplete = parseInt((self.currentLine / self.numLines) * 100, 10);
                }),
              });
              self.queue.queueCommands(commandArray);
            }
          }
        } catch (ex) {
          self.logger.error('Line read error', line, ex);
        }
      }));

      self.lr.on('end', bsync(() => {
        self.logger.info('completed reading file,', theFile.filePath, 'is closed now.');
        bwait(self.lr.close());
        self.queue.queueCommands({
          postCallback: bsync(() => {
            self.currentJob.percentComplete = 100;
            self.fsm.stop();
            self.fsm.stopDone();
            self.currentJob.fsm.runningDone();
            self.currentJob.stopwatch.stop();
            self.currentJob = undefined;

            self.status.checkpoint = undefined;
            self.status.collaborators = {};
            self.status.blocker = {
              bot: undefined,
              checkpoint: undefined,
            };
            self.lr = undefined;
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
      if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
        self.serialLogger.info('Beginning to read a gcode file, line by line');
      }
      self.lr.resume();
      self.fsm.startDone();
    }),
    park: function park(self, params) {
      try {
        if (self.fsm.current === 'processingJob') {
          self.fsm.parkJob();
          self.queue.queueCommands({
            code: 'M114',
            processData: (command, reply) => {
              let zPosition;
              let yPosition;
              // Parse current position

              try {
                zPosition = Number(reply.split('Z:')[1].split('E:')[0]);
                yPosition = Number(reply.split('Y:')[1].split('Z:')[0]);
              } catch (ex) {
                self.logger.error('Parse Z fail', ex);
                throw ex;
              }

              const parkLift = 10;
              const commandArray = [];
              commandArray.push('G92 E0');
              commandArray.push('G1 E-2 F3000'); // Retract
              if (zPosition < 400) {
                commandArray.push(`G1 Z${(zPosition + parkLift).toFixed(2)} F1000`);
              }
              if (Number(yPosition - self.settings.offsetY) > 0) {
                commandArray.push('G1 Y' + (0 + Number(self.settings.offsetY) ).toFixed(2) + ' F10000'); // Scrub
              }
              commandArray.push('G1 Y' + (-40.0 + Number(self.settings.offsetY) ).toFixed(2) + ' F2000'); // Drag Y across the purge
              commandArray.push('M400'); // Clear motion buffer before saying we're done
              commandArray.push({
                postCallback: () => {
                  self.fsm.parkJobDone();
                },
              });
              self.logger.info('parking', JSON.stringify(commandArray));
              self.queue.queueCommands(commandArray);
              return true;
            },
          });
        } else {
          self.logger.error('Cannot park from state', self.fsm.current);
        }
      } catch (ex) {
        self.logger.error(ex);
        if (self.fsm.current === 'parkingJob') {
          self.fsm.parkJobFail();
        }
      }
      return self.getBot();
    },
    unpark: function unpark(self, params) {
      const purgeAmount = 10;
      try {
        if (self.fsm.current === 'parkedJob') {
          self.fsm.unparkJob();
          const commandArray = [];
          if (params.dry === false) {
            commandArray.push('G92 E0');
            commandArray.push(`G1 E${purgeAmount} F100`); // Purge
            commandArray.push(`G1 E${purgeAmount - 2} F3000`); // Retract
            commandArray.push('G1 Y' + (0 + Number(self.settings.offsetY)).toFixed(2) + ' F2000'); // Scrub
            commandArray.push('G92 E-2'); // Prepare extruder for E0
            commandArray.push('M400'); // Clear motion buffer before saying we're done
          }
          commandArray.push({
            postCallback: () => {
              self.fsm.unparkJobDone();
            },
          });
          self.logger.info('unparking', JSON.stringify(commandArray));
          self.queue.queueCommands(commandArray);
        } else {
          self.logger.error('Cannot unpark from state', self.fsm.current);
        }
      } catch (ex) {
        self.logger.error('unparkjob error', ex);
        if (self.fsm.current === 'unparkingJob') {
          self.fsm.unparkJobFail();
        }
      }
      return self.getBot();
    },
  });
};

module.exports = SmoothieBoard;
