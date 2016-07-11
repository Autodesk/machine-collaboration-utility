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
    };

    this.commands.unplug = async (self, params) => {
      self.device = undefined;
      await self.fsm.unplug();
    };

    this.commands.resume = (self, params) => {
      return {
        preCallback: async () => {
          await self.fsm.start();
          await self.queue.resume();
        },
        code: 'G4 S1',
        postCallback: async () => {
          await self.lr.resume();
          await self.fsm.startDone();
        },
      };
    };

    this.commands.pause = (self, params) => {
      return {
        code: 'G4 S1',
        postCallback: async () => {
          self.queue.pause();
          await self.fsm.stopDone();
        },
      };
    };

    this.commands.stop = (self, params) => {
      return {
        code: 'G4 S1',
        postCallback: async () => {
          self.queue.pause();
          await self.fsm.stopDone();
        },
      };
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
    };

    this.commands.jog = (self, params) => {
      const commandArray = [];
      commandArray.push(`G91`);
      commandArray.push(`G1 ${params.axis.toUpperCase()}${params.amount}`);
      commandArray.push(`G90`);
      self.queue.queueCommands(commandArray);
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
    };
  }
};
