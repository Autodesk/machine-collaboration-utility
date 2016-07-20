const DefaultBot = require(`./DefaultBot`);

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
  }
};
