const _ = require('underscore');

const Marlin = require('./Marlin');

const Boot = function Boot(app) {
  Marlin.call(this, app);

  _.extend(this.settings, {
    name: 'KLONER3D',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    vidPid: [
      {
        vid: 0x0403,
        pid: 0x6001,
      },
    ],
    baudrate: 115200,
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

              const parkLift = 1;
              const commandArray = [];
              commandArray.push('G92 E0');
              commandArray.push('G1 E-2 F3000'); // Retract
              if (zPosition < 139) {
                commandArray.push(`G1 Z${(zPosition + parkLift).toFixed(2)} F1000`);
              }

              // Park bot1 on the left, and bot2 on the right
              const xPos = self.settings.name.includes('bot1') ? 4 : 498;
              commandArray.push(`G1 X${xPos} Y4 F3000`);
              commandArray.push('G4 P0'); // Clear motion buffer before saying we're done
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
          const purgeAmount = 20;
          if (params.dry === false) {
            commandArray.push('G92 E0');
            commandArray.push(`G1 E${purgeAmount} F100`); // Purge
            commandArray.push(`G1 E${purgeAmount - 2} F3000`); // Retract
            const xPos = self.settings.name.includes('bot1') ? 40 : 460;
            commandArray.push(`G1 X${xPos} Y52 F1000`); // Scrub
            commandArray.push('G92 E-2'); // Prepare extruder for E0
            commandArray.push('G4 P0'); // Clear motion buffer before saying we're done
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

module.exports = Boot;
