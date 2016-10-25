const _ = require('underscore');

const Marlin = require('./Marlin');

const SmoothieBoard = function SmoothieBoard(app) {
  Marlin.call(this, app);

  _.extend(this.settings, {
    name: 'SmoothieBoard',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    vid: 7504,
    pid: 24597,
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
              if (Number(yPosition - self.settings.offsetY) > -50) {
                commandArray.push('G1 Y' + (-50.0 + Number(self.settings.offsetY) ).toFixed(2) + ' F10000'); // Scrub
              }
              commandArray.push('G1 Y' + (-78.0 + Number(self.settings.offsetY) ).toFixed(2) + ' F2000'); // Drag Y across the purge
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
      try {
        if (self.fsm.current === 'parkedJob') {
          self.fsm.unparkJob();
          const commandArray = [];
          if (params.dry === false) {
            commandArray.push('G92 E0');
            commandArray.push('G1 E12 F100'); // Purge
            commandArray.push('G1 E10 F3000'); // Retract
            commandArray.push('G1 Y' + (-50.0 + Number(self.settings.offsetY) ).toFixed(2) + ' F2000'); // Scrub
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
