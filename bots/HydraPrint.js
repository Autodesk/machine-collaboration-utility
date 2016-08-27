const _ = require('underscore');
const DefaultBot = require('./DefaultBot');
const request = require('request-promise');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');

const HydraPrint = function(app) {
  DefaultBot.call(this, app);

  _.extend(this.settings, {
    model: `HydraPrint`,
    name: __filename.split(`${__dirname}/`)[1].split('.js')[0],
  });

  _.extend(this.info, {
    connectionType: `hydraprint`,
  });

  _.extend(this.commands, {
    updateRoutine: bsync((self, params) => {
      const requestParams = {
        method: `GET`,
        uri: self.port,
        json: true,
      };
      const reply = bwait(request(requestParams));
      self.status.position.x = reply.data.status.position.x;
      self.status.position.y = reply.data.status.position.y;
      self.status.position.z = reply.data.status.position.z;
      self.status.position.e = reply.data.status.position.e;
      self.status.sensors.t0 = reply.data.status.sensors.t0;
      self.app.io.broadcast(`botEvent`, {
        uuid: self.settings.uuid,
        event: `update`,
        data: self.getBot(),
      });
    }),
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
            if (typeof reply.data === `boolean`) {
              resolve(reply.data);
            } else {
              resolve(reply.data.replace(`\r`, ``));
            }
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
      const feedRate = self.settings[`jog${params.axis.toUpperCase()}Speed`];
      const amount = Number(params.amount);

      const commandArray = [];
      commandArray.push(self.commands.gcodeInitialState(self, params));
      commandArray.push({
        postCallback: bsync(() => {
          const requestParams = {
            method: `POST`,
            uri: self.port,
            body: {
              command: `jog`,
              axis: params.axis,
              amount,
              feedRate,
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
      });
      commandArray.push(self.commands.gcodeFinalState(self, params));
      self.queue.queueCommands(commandArray);
      return true;
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

module.exports = HydraPrint;
