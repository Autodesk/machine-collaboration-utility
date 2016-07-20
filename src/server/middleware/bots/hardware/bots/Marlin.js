const DefaultBot = require(`./DefaultBot`);

module.exports = class Marlin extends DefaultBot {
  constructor(app) {
    super(app);
    this.connectionType = `serial`;
    this.status = {
      position: {},
      sensors: {},
    };

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
            self.status.position.x = reply.data.split('X:')[1].split(' ')[0];
            self.status.position.y = reply.data.split('Y:')[1].split(' ')[0];
            self.status.position.z = reply.data.split('Z:')[1].split(' ')[0];
            self.status.position.e = reply.data.split('E:')[1].split(' ')[0];
            return true;
          },
        });
        commandArray.push({
          code: `M105`,
          processData: (command, reply) => {
            self.status.sensors.t0 = reply.data.split('T0:')[1].split(' ')[0];
            return true;
          },
        });
        self.queue.queueCommands(commandArray);
      }
    };

    this.commands.processGcode = async (self, params) => {
      let gcode = params.gcode;
      if (gcode === undefined) {
        throw `"gcode" is undefined`;
      }
      const commandArray = [];

      const state = self.fsm.current;
      switch (state) {
        case `connected`:
        case `processingGcode`:
          commandArray.push({
            preCallback: () => {
              self.fsm.connectedToGcode();
            },
          });
          break;
        case `processingJob`:
        case `processingJobGcode`:
          commandArray.push({
            preCallback: () => {
              self.fsm.jobToGcode();
            },
          });
          break;
        case `parked`:
          break;
        default:
          throw `"processGcode" not possible from state "${state}`;
      }
      return await new Promise((resolve, reject) => {
        commandArray.push({
          code: gcode,
          processData: (command, reply) => {
            resolve(reply.replace(`\r`, ``));
            return true;
          },
        });
        switch (state) {
          case `connected`:
          case `processingGcode`:
            commandArray.push({
              preCallback: () => {
                self.fsm.connectedGcodeDone();
              },
            });
            break;
          case `processingJob`:
          case `processingJobGcode`:
            commandArray.push({
              preCallback: () => {
                self.fsm.jobGcodeDone();
              },
            });
            break;
          case `parked`:
            break;
          default:
            break;
        }
        self.queue.queueCommands(commandArray);
      });
    };

    this.commands.streamGcode = (self, params) => {
      if (self.queue.mQueue.length >= 32) {
        return false;
      }
      let gcode = params.gcode;
      if (gcode === undefined) {
        throw `"gcode" is undefined`;
      }
      const commandArray = [];

      const state = self.fsm.current;
      switch (state) {
        case `connected`:
        case `processingGcode`:
          commandArray.push({
            preCallback: () => {
              self.fsm.connectedToGcode();
            },
          });
          break;
        case `processingJob`:
        case `processingJobGcode`:
          commandArray.push({
            preCallback: () => {
              self.fsm.jobToGcode();
            },
          });
          break;
        case `parked`:
          commandArray.push({
            preCallback: () => {
              self.fsm.parkToGcode();
            },
          });
          break;
        default:
          throw `"streamGcode" not possible from state "${state}`;
      }
      commandArray.push(gcode);
      switch (state) {
        case `connected`:
        case `processingGcode`:
          commandArray.push({
            preCallback: () => {
              self.fsm.connectedGcodeDone();
            },
          });
          break;
        case `processingJob`:
        case `processingJobGcode`:
          commandArray.push({
            preCallback: () => {
              self.fsm.jobGcodeDone();
            },
          });
          break;
        case `parked`:
          break;
        default:
          break;
      }
      self.queue.queueCommands(commandArray);
      return true;
    };

    this.commands.jog = (self, params) => {
      const commandArray = [];
      commandArray.push({
        code: `M114`,
        processData: (command, reply) => {
          const currentLocation = {};
          currentLocation.x = Number(reply.split('X:')[1].split(' ')[0]);
          currentLocation.y = Number(reply.split('Y:')[1].split(' ')[0]);
          currentLocation.z = Number(reply.split('Z:')[1].split(' ')[0]);
          currentLocation.e = Number(reply.split('E:')[1].split(' ')[0]);
          const newPosition = currentLocation[params.axis] + params.amount;
          const jogSpeed = self.settings[`jog${params.axis.toUpperCase()}Speed`];
          const jogGcode = `G1 ${params.axis.toUpperCase()}${newPosition} F${jogSpeed}`;
          self.queue.prependCommands(jogGcode)
          return true;
        },
      });
      self.queue.queueCommands(commandArray);
      return self.getBot();
    };
  }
};
