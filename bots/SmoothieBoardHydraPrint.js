const _ = require('underscore');
const request = require('request-promise');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');
const Promise = require('bluebird');

const HydraPrint = require('./HydraPrint');

function dumpError(err) {
  if (typeof err === 'object') {
    if (err.message) {
      console.log('\nMessage: ' + err.message)
    }
    if (err.stack) {
      console.log('\nStacktrace:')
      console.log('====================')
      console.log(err.stack);
    }
  } else {
    console.log('dumpError :: argument is not an object');
  }
}

const SmoothieBoardHydraPrint = function SmoothieBoardHydraPrint(app){
  HydraPrint.call(this, app);

  const parkLift = 10;

  _.extend(this.settings, {
    name: 'Smoothie Board HydraPrint',
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.commands, {
    park: function park(self, params) {
      self.fsm.park();
      try {
        self.queue.queueCommands({
          code: 'M114',
          processData: (command, reply) => {
            const positionString = reply.data;
            let zPosition;
            // Parse current position

            try {
              zPosition = Number(positionString.split('Z:')[1].split('E:')[0]);
              yPosition = Number(positionString.split('Y:')[1].split('Z:')[0]);
            } catch (ex) {
              self.logger.error('Parse Z fail', ex);
              throw ex;
            }

            const commandArray = [];
            commandArray.push('G92 E0');
            commandArray.push('G1 E-2 F3000'); // Retract
            if (zPosition < 400) {
              commandArray.push({
                postCallback: bsync(() => {
                  const requestParams = {
                    method: 'POST',
                    uri: self.port,
                    body: {
                      command: 'jog',
                      axis: 'z',
                      amount: parkLift,
                      feedRate: 1000,
                    },
                    json: true,
                  };
                  try {
                    bwait(request(requestParams));
                  } catch (ex) {
                    self.logger.error(`Jog Failed: ${ex}`);
                  }
                  return true;
                }),
              })
            }
            if (Number(yPosition) > -50) {
              commandArray.push('G1 Y-50 F10000'); // Home Y
            }
            commandArray.push('G1 Y-78 F2000'); // Drag Y across the purge
            commandArray.push('M400'); // Clear motion buffer before saying we're done
            commandArray.push({
              postCallback: () => {
                self.fsm.parkDone();
              },
            });
            self.logger.info('parking', JSON.stringify(commandArray))
            self.queue.queueCommands(commandArray);
            return true;
          },
        });
      } catch (ex) {
        dumpError(ex);
        self.fsm.parkFail();
      }
      return self.getBot();
    },

    unpark: function unpark(self, params) {
      self.fsm.unpark();
      if (!params.dryJob) {
        try {
          const commandArray = [];
          if (params.xEntry !== undefined && params.xEntry !== null) {
            console.log('unparking and jogging X', params.xEntry);
            commandArray.push(`G1 X${params.xEntry} F3000`);
          }
          commandArray.push('G92 E0');
          commandArray.push('G1 E12 F100'); // Purge
          commandArray.push('G1 E10 F3000'); // Purge
          commandArray.push('G1 Y-50 F2000'); // Scrub
          commandArray.push('G92 E-2'); // Prepare extruder for E0
          commandArray.push('M400'); // Clear motion buffer before saying we're done
          commandArray.push({
            postCallback: () => {
              self.fsm.unparkDone();
            },
          });
          self.logger.info('unparking', JSON.stringify(commandArray))
          self.queue.queueCommands(commandArray);
        } catch (ex) {
          self.fsm.unparkFail();
        }
      } else {
        self.fsm.unparkDone();
      }
      return self.getBot();
    },
  });
};

module.exports = SmoothieBoardHydraPrint;
