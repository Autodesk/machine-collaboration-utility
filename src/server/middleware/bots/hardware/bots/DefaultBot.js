module.exports = class DefaultBot {
  constructor(app) {
    this.app = app;
    this.logger = app.context.logger;
    this.connectionType = undefined;

    this.settings = {
      name: `Default`,
      model: `DefaultBot`,
      jogXSpeed: `1000`,
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

    this.commands = {};

    this.commands.connect = async (self, params) => {
      try {
        self.fsm.connect();
        self.queue.queueCommands({
          open: true,
          postCallback: () => {
            self.fsm.connectDone();
          },
        });
      } catch (ex) {
        self.fsm.connectFail();
      }
      return self.getBot();
    };

    this.commands.disconnect = async (self, params) => {
      try {
        self.fsm.disconnect();
        self.queue.queueCommands({
          close: true,
          postCallback: () => {
            self.fsm.disconnectDone();
          },
        });
      } catch (ex) {
        self.fsm.disconnectFail();
      }
      return self.getBot();
    };

    this.commands.unplug = async (self, params) => {
      self.device = undefined;
      await self.fsm.unplug();
      return self.getBot();
    };

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
                resolve(reply);
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

    this.commands.resume = (self, params) => {
      const commandArray = [];
      commandArray.push({
        preCallback: async () => {
          await self.fsm.start();
          await self.queue.resume();
        },
        code: 'G4 S1',
        postCallback: async () => {
          await self.lr.resume();
          await self.fsm.startDone();
        },
      });
      self.queue.queueCommands(commandArray);
      return self.getBot();
    };

    this.commands.pause = (self, params) => {
      const commandArray = [];
      commandArray.push({
        code: 'G4 S1',
        postCallback: async () => {
          self.queue.pause();
          await self.fsm.stopDone();
        },
      });
      self.queue.queueCommands(commandArray);
      return self.getBot();
    };

    this.commands.stop = (self, params) => {
      const commandArray = [];
      commandArray.push({
        code: 'G4 S1',
        postCallback: async () => {
          self.queue.pause();
          await self.fsm.stopDone();
        },
      });
      self.queue.queueCommands(commandArray);
      return self.getBot();
    };

    this.commands.park = (self, params) => {
      const commandArray = [];
      commandArray.push({
        code: 'G4 S1',
        postCallback: async () => {
          await self.fsm.parkDone();
        },
      });
      self.queue.queueCommands(commandArray);
      return self.getBot();
    };

    this.commands.unpark = (self, params) => {
      const commandArray = [];
      commandArray.push({
        code: 'G4 S1',
        postCallback: async () => {
          await self.fsm.unparkDone();
        },
      });
      self.queue.queueCommands(commandArray);
      return self.getBot();
    };

    this.commands.jog = (self, params) => {
      const commandArray = [];
      commandArray.push(`G91`);
      commandArray.push(`G1 ${params.axis.toUpperCase()}${params.amount}`);
      commandArray.push(`G90`);
      self.queue.queueCommands(commandArray);
      return self.getBot();
    };

    this.commands.addSubscriber = (self, params) => {
      if (self.subscribers === undefined) {
        self.subscribers = [];
      }
      const subscriberEndpoint = params.subscriberEndpoint;
      let unique = true;
      for (const subscriber of self.subscribers) {
        if (subscriber === subscriberEndpoint) {
          unique = false;
        }
      }
      if (unique) {
        self.subscribers.push(subscriberEndpoint);
      }
      return self.getBot();
    };
    this.commands.update = (self, params) => {
      const event = params.body.event;
      const bot = params.body.bot;

      const theEvent = self.fsmEvents.find((fsmEvent) => {
        return fsmEvent.name === event;
      });

      self.fsm.current = theEvent.from;
      self.fsm[theEvent.name]();
    };
  }
};
