const _ = require('underscore');
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

  const parkLift = 5;

  _.extend(this.settings, {
    name: `Smoothie Board HydraPrint`,
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.commands, {
    park: function park(self, params) {
      self.fsm.park();
      try {
        self.queue.queueCommands({
          code: `M114`,
          processData: (command, reply) => {
            const positionString = reply.data;
            let zPosition;
            let zDestination;
            // Parse current position

            try {
              zPosition = Number(positionString.split('Z:')[1].split('E:')[0]);
              yPosition = Number(positionString.split('Y:')[1].split('Z:')[0]);
              if (zPosition < 400) {
                zDestination = Number(zPosition + parkLift).toFixed(4);
              } else {
                zDestination = zPosition;
              }
            } catch (ex) {
              self.logger.error(`Parse Z fail`, ex);
              throw ex;
            }

            const commandArray = [];
            commandArray.push(`G92 E0`);
            commandArray.push(`G1 E-2 F3000`); // Retract
            if (zPosition < 400) {
              commandArray.push(`G1 Z${zDestination} F1000`); // Jog up in Z
            }
            if (Number(yPosition) > 0) {
              commandArray.push(`G1 Y0 F2000`); // Home Y
            }
            commandArray.push(`G1 Y-78 F600`); // Drag Y across the purge
            commandArray.push({
              postCallback: () => {
                self.fsm.parkDone();
              },
            });
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
      if (params.dryJob) {
        try {
          const commandArray = [];
          if (params.xEntry !== undefined && params.xEntry !== null) {
            console.log('unparking and jogging X', params.xEntry);
            commandArray.push(`G1 X${params.xEntry} F3000`);
          }
          commandArray.push(`G92 E0`);
          commandArray.push(`G1 E22 F100`); // Purge
          commandArray.push(`G1 E20 F3000`); // Retract
          commandArray.push(`G1 Y0 F600`); // Scrub
          commandArray.push({
            postCallback: () => {
              self.fsm.unparkDone();
            },
          });
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
