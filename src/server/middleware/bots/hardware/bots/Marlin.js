const DefaultBot = require(`./DefaultBot`);

module.exports = class Marlin extends DefaultBot {
  constructor(app) {
    super(app);
    this.connectionType = `serial`;

    this.settings = {
      model: `Marlin`,
      name: `Marlin`,
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

    this.vid = undefined;
    this.pid = undefined;
    this.baudrate = undefined;

    this.fileTypes = ['.gcode'];

    this.commands.updateRoutine = (self, params) => {
      if (self.fsm.current === `connected`) {
        const commandArray = [];
        commandArray.push({
          code: `M114`,
          processData: (command, reply) => {
            self.status.position.x = reply.split('X:')[1].split(' ')[0];
            self.status.position.y = reply.split('Y:')[1].split(' ')[0];
            self.status.position.z = reply.split('Z:')[1].split(' ')[0];
            self.status.position.e = reply.split('E:')[1].split(' ')[0];
            return true;
          },
        });
        commandArray.push({
          code: `M105`,
          processData: (command, reply) => {
            self.status.sensors.t0 = reply.split('T:')[1].split(' ')[0];
            self.app.io.emit(`updateBots`, self.app.context.bots.getBots());
            return true;
          },
        });
        self.queue.queueCommands(commandArray);
      }
    };

    this.commands.processGcode = async (self, params) => {
      const gcode = params.gcode;
      if (gcode === undefined) {
        throw `"gcode" is undefined`;
      }
      const commandArray = [];

      return await new Promise((resolve, reject) => {
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
      });
    };

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
        code: `M114`,
        processData: (command, reply) => {
          const currentLocation = {};
          currentLocation.x = Number(reply.split('X:')[1].split(' ')[0]);
          currentLocation.y = Number(reply.split('Y:')[1].split(' ')[0]);
          currentLocation.z = Number(reply.split('Z:')[1].split(' ')[0]);
          currentLocation.e = Number(reply.split('E:')[1].split(' ')[0]);
          const newPosition = currentLocation[params.axis] + params.amount;
          let feedRate;
          if (params.feedRate) {
            feedRate = params.feedRate
          } else {
            feedRate = self.settings[`jog${params.axis.toUpperCase()}Speed`];
          }
          const jogGcode = `G1 ${params.axis.toUpperCase()}${newPosition} F${feedRate}`;
          self.queue.prependCommands(jogGcode);
          return true;
        },
      });
      commandArray.push(self.commands.gcodeFinalState(self, params));
      self.queue.queueCommands(commandArray);
      return self.getBot();
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
  }
};
