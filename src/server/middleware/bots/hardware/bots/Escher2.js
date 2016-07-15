const Escher2Conductor = require(`./Escher2Conductor`);

module.exports = class Escher2 extends Escher2Conductor {
  constructor(app) {
    super(app);
    this.settings.name = `Escher 2`;
    this.settings.model = `Escher2`;
    this.connectionType = `serial`;
    this.vid = 9025;
    this.pid = 66;
    this.baudrate = 230400;

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
                resolve(reply.replace(`\r`, ``));
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

    this.commands.streamGcode = async (self, params) => {
      let gcode = params.gcode;
      const state = self.fsm.current;
      switch (state) {
        case `connected`:
        case `processingJob`:
        case `processingJobGcode`:
        case `processingGcode`:
          if (self.queue.mQueue.length < 32) {
            gcode = self.addOffset(gcode);
            gcode = self.addSpeedMultiplier(gcode);
            gcode = self.addFeedMultiplier(gcode);
            self.queue.queueCommands(gcode);
            return true;
          }
          return false; // `Command Queue is full. Please try again later`;
        default:
          return undefined;
      }
    };
  }
};
