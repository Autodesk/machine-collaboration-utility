const _ = require('underscore');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');

const DefaultBot = require('./DefaultBot');

const Marlin = function (app) {
  DefaultBot.call(this, app);

  _.extend(this.settings, {
    name: `Marlin`,
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    connectionType: `serial`,
    vid: undefined,
    pid: undefined,
    baudrate: undefined,
    fileTypes: ['.gcode'],
  });

  _.extend(this.commands, {
    updateRoutine: (self, params) => {
      self.status = {
        position: {
          x: undefined,
          y: undefined,
          z: undefined,
          e: undefined,
        },
        sensors: {
          t0: {
            temperature: undefined,
            setpoint: undefined,
          },
          b0: {
            temperature: undefined,
            setpoint: undefined,
          },
        },
      };

      if (self.fsm.current === `connected`) {
        const commandArray = [];
        commandArray.push({
          code: `M114`,
          processData: (command, reply) => {
            const newPosition = {
              x: undefined,
              y: undefined,
              z: undefined,
              e: undefined,
            };
            try {
              newPosition.x = Number(Number(reply.split('X:')[1].split('Y')[0]) - Number(self.settings.offsetX)).toFixed(3);
              newPosition.y = Number(Number(reply.split('Y:')[1].split('Z')[0]) - Number(self.settings.offsetY)).toFixed(3);
              newPosition.z = Number(Number(reply.split('Z:')[1].split('E')[0]) - Number(self.settings.offsetZ)).toFixed(3);
              newPosition.e = reply.split('E:')[1].split(' ')[0];
              self.status.position = newPosition;
              return true;
            } catch (ex) {
              self.logger.error(`Failed to set position`, reply, ex);
            }
          },
        });
        commandArray.push({
          code: `M105`,
          processData: (command, reply) => {
            self.status.sensors.t0 = {
              temperature: '?',
              setpoint: '?',
            };
            self.status.sensors.b0 = {
              temperature: '?',
              setpoint: '?',
            };

            try {
              self.status.sensors.t0.temperature = reply.split('T:')[1].split(' ')[0];
              self.status.sensors.t0.setpoint = reply.split('T:')[1].split('/')[1].split(' ')[0];
            } catch (ex) {
              // this.logger.info(`Failed to parse nozzle temp`);
            }

            try {
              self.status.sensors.b0.temperature = reply.split('B:')[1].split(' ')[0];
              self.status.sensors.b0.setpoint = reply.split('B:')[1].split('/')[1].split(' ')[0];
            } catch (ex) {
              // this.logger.info(`Failed to parse bed temp`);
            }

            self.app.io.broadcast(`botEvent`, {
              uuid: self.settings.uuid,
              event: `update`,
              data: self.getBot(),
            });
            return true;
          },
        });
        self.queue.queueCommands(commandArray);
      }
    },
    processGcode: bsync((self, params) => {
      const gcode = self.addOffset(params.gcode);
      if (gcode === undefined) {
        throw `"gcode" is undefined`;
      }
      const commandArray = [];

      return bwait(new Promise((resolve, reject) => {
        commandArray.push(self.commands.gcodeInitialState(self, params));
        commandArray.push({
          code: gcode,
          processData: (command, reply) => {
            resolve(reply.replace(`\r`, ``));
            return true;
          },
        });
        commandArray.push(self.commands.gcodeFinalState(self, params));

        self.queue.queueCommands(commandArray);
      }));
    }),
    streamGcode: (self, params) => {
      if (self.queue.mQueue.length >= 32) {
        return false;
      }
      const gcode = self.addOffset(params.gcode);
      if (gcode === undefined) {
        throw `"gcode" is undefined`;
      }
      const commandArray = [];
      commandArray.push(self.commands.gcodeInitialState(self, params));
      commandArray.push(gcode);
      commandArray.push(self.commands.gcodeFinalState(self, params));

      self.queue.queueCommands(commandArray);
      return true;
    },
    jog: (self, params) => {
      const commandArray = [];
      commandArray.push(self.commands.gcodeInitialState(self, params));
      commandArray.push({
        code: `M114`,
        processData: (command, reply) => {
          const currentLocation = {};
          currentLocation.x = Number(reply.split('X:')[1].split('Y')[0]);
          currentLocation.y = Number(reply.split('Y:')[1].split('Z')[0]);
          currentLocation.z = Number(reply.split('Z:')[1].split('E')[0]);
          currentLocation.e = Number(reply.split('E:')[1].split(' ')[0]);
          const newPosition = currentLocation[params.axis] + params.amount;
          let feedRate;
          if (params.feedRate) {
            feedRate = params.feedRate;
          } else {
            feedRate = self.settings[`jog${params.axis.toUpperCase()}Speed`];
          }
          let jogGcode = `G1 ${params.axis.toUpperCase()}${newPosition} F${feedRate}`;
          self.queue.prependCommands(jogGcode);
          return true;
        },
      });
      commandArray.push(self.commands.gcodeFinalState(self, params));
      self.queue.queueCommands(commandArray);
      return self.getBot();
    },
    gcodeInitialState: (self, params) => {
      let command = ``;
      switch (self.fsm.current) {
        case `connected`:
          break;
        case `processingJob`:
        case `processingJobGcode`:
          command = {
            preCallback: () => {
              self.fsm.jobToGcode();
            },
          };
          break;
        case `parked`:
          command = {
            preCallback: () => {
              self.fsm.parkToGcode();
            },
          };
          break;
        default:
          throw `"processGcode" not possible from state "${self.fsm.current}`;
      }
      return command;
    },
    gcodeFinalState: (self, params) => {
      let command = ``;
      switch (self.fsm.current) {
        case `connected`:
          break;
        case `processingJob`:
        case `processingJobGcode`:
          command = {
            preCallback: () => {
              self.fsm.jobGcodeDone();
            },
          };
          break;
        case `processingParkGcode`:
          command = {
            preCallback: () => {
              self.fsm.parkGcodeDone();
            },
          };
          break;
        default:
          break;
      }
      return command;
    },
  });
};

module.exports = Marlin;
