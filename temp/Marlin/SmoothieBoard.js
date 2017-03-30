const _ = require('lodash');
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
