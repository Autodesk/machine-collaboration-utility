const util = require(`util`);
const DefaultBot = require(`./DefaultBot`);
const request = require(`request-promise`);
const bsync = require(`asyncawait/async`);
const bwait = require(`asyncawait/await`);

const HydraPrintBot = function(app) {
  DefaultBot.call(this, app);
  this.connectionType = `hydraprint`;

  this.settings = {
    model: `HydraPrint`,
    name: `HydraPrint`,
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

  this.commands.processGcode = bsync((self, params) => {
    const gcode = params.gcode;
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
  });

  this.commands.streamGcode = (self, params) => {
    if (self.queue.mQueue.length >= 32) {
      return false;
    }
    const gcode = params.gcode;
    if (gcode === undefined) {
      throw `"gcode" is undefined`;
    }
    const commandArray = [];
    commandArray.push(self.commands.gcodeInitialState(self, params));
    commandArray.push(gcode);
    commandArray.push(self.commands.gcodeFinalState(self, params));

    self.queue.queueCommands(commandArray);
    return true;
  };

  this.commands.jog = (self, params) => {
    const commandArray = [];
    commandArray.push(self.commands.gcodeInitialState(self, params));
    commandArray.push({
      postCallback: bsync(() => {
        const feedRate = self.settings[`jog${params.axis.toUpperCase()}Speed`];
        const requestParams = {
          method: `POST`,
          uri: self.port,
          body: {
            command: `jog`,
            axis: params.axis,
            amount: params.amount,
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
  };

  this.commands.gcodeInitialState = (self, params) => {
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
        throw `"processGcode" not possible from state "${state}`;
    }
    return command;
  };

  this.commands.gcodeFinalState = (self, params) => {
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
  };
};

util.inherits(HydraPrintBot, DefaultBot);

module.exports = HydraPrintBot;
