const DefaultBot = require(`./DefaultBot`);

module.exports = class HydraPrintBot extends DefaultBot {
  constructor(app) {
    super(app);
    this.connectionType = `http`;

    this.commands.processGcode = async (self, params) => {
      return await new Promise((resolve, reject) => {
        const commandArray = [];
        const state = self.fsm.current;
        switch (state) {
          case `connected`:
          case `processingJob`:
          case `processingJobGcode`:
          case `processingGcode`:
            let gcode = params.gcode;
            gcode = self.addOffset(gcode);
            gcode = self.addSpeedMultiplier(gcode);
            gcode = self.addFeedMultiplier(gcode);
            commandArray.push({
              code: gcode,
              processData: (command, reply) => {
                if (typeof reply.data === `boolean`) {
                  resolve(reply.data);
                  return true;
                }
                if (typeof reply.data === `string`) {
                  resolve(reply.data.replace(`\r`, ``));
                  return true;
                }
                this.logger.error(`Strange reply`, typeof reply, reply);
              },
            });
            self.queue.queueCommands(commandArray);
            break;
          default:
            break;
        }
      });
    };
    this.commands.streamGcode = async (self, params) => {
      return await new Promise((resolve, reject) => {
        const commandArray = [];
        const state = self.fsm.current;
        switch (state) {
          case `connected`:
          case `processingJob`:
          case `processingJobGcode`:
          case `processingGcode`:
            let gcode = params.gcode;
            gcode = self.addOffset(gcode);
            gcode = self.addSpeedMultiplier(gcode);
            gcode = self.addFeedMultiplier(gcode);
            commandArray.push({
              code: gcode,
              processData: (command, reply) => {
                resolve(String(reply.data).replace(`\r`, ``));
                return true;
              },
            });
            self.queue.queueCommands(commandArray);
            break;
          default:
            break;
        }
      });
    };
  }
};
