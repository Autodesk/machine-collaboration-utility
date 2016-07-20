const DefaultBot = require(`./DefaultBot`);
const request = require(`request-promise`);

module.exports = class HydraPrintBot extends DefaultBot {
  constructor(app) {
    super(app);
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
        postCallback: async () => {
          const requestParams = {
            method: `POST`,
            uri: self.port,
            body: {
              command: `jog`,
              axis: params.axis,
              amount: params.amount,
            },
            json: true,
          };
          try {
            await request(requestParams);
          } catch (ex) {
            self.logger.error(`Jog Failed: ${ex}`);
          }
          return true;
        },
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
  }
};
