module.exports = class DefaultBot {
  constructor(app) {
    this.app = app;
    this.logger = app.context.logger;
    this.connectionType = undefined;
    this.status = {
      position: {},
      sensors: {},
    };

    this.settings = {
      model: `DefaultBot`,
      name: `Default`,
      endpoint: false,
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

    this.fileTypes = [];

    this.commands = {};

    // Job pass through commands. These allow the bot to be a gateway for job commands
    this.commands.pauseJob = async (self, params) => {
      if (self.currentJob === undefined) {
        throw `Bot ${self.settings.name} is not currently processing a job`;
      }
      await self.currentJob.pause(params);
      return self.getBot();
    };

    this.commands.resumeJob = async (self, params) => {
      if (self.currentJob === undefined) {
        throw `Bot ${self.settings.name} is not currently processing a job`;
      }
      await self.currentJob.resume(params);
      return self.getBot();
    };

    this.commands.cancelJob = async (self, params) => {
      if (self.currentJob === undefined) {
        throw `Bot ${self.settings.name} is not currently processing a job`;
      }
      await self.currentJob.cancel(params);
      return self.getBot();
    };
    // End of Job pass through commands

    this.commands.updateRoutine = (self, params) => {
      if (self.fsm.current === `connected`) {
        const commandArray = [];
        commandArray.push({
          code: `G4 P10`,
          processData: (command, reply) => {
            return true;
          },
        });
        self.queue.queueCommands(commandArray);
      }
    };

    this.commands.toggleUpdater = (self, params) => {
      const update = params.update;
      if (update === undefined) {
        throw `"update" is not defined`;
      }
      if (update) {
        if (self.updateInterval === undefined) {
          self.updateInterval = setInterval(() => {
            self.commands.updateRoutine(self);
          }, 1000);
        }
        return `Bot update routine is on`;
      }
      if (self.updateInterval !== undefined) {
        clearInterval(self.updateInterval);
      }
      return `Bot update routine is off`;
    };

    // NOTE a try / catch on queueing commands will not actually fix an error
    // TODO attach an error handler to the about-to-be-queued command
    this.commands.connect = (self, params) => {
      self.fsm.connect();
      try {
        self.queue.queueCommands({
          open: true,
          postCallback: () => {
            self.commands.toggleUpdater(self, { update: true });
            self.fsm.connectDone();
          },
        });
      } catch (ex) {
        self.fsm.connectFail();
      }
      return self.getBot();
    };

    this.commands.disconnect = (self, params) => {
      self.fsm.disconnect();
      try {
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

    this.commands.unplug = (self, params) => {
      self.fsm.unplug();
      return self.getBot();
    };

    this.commands.resume = (self, params) => {
      if (self.fsm.current === `parked`) {
        self.commands.unpark(self);
      }
      self.fsm.start();
      const commandArray = [];
      commandArray.push({
        postCallback: () => {
          self.lr.resume();
          self.fsm.startDone();
        },
      });
      self.queue.queueCommands(commandArray);
      self.queue.resume();
      return self.getBot();
    };

    this.commands.pause = (self, params) => {
      self.fsm.stop();
      const commandArray = [];
      commandArray.push({
        postCallback: () => {
          self.queue.pause();
          self.fsm.stopDone();
        },
      });
      self.queue.prependCommands(commandArray);
      return self.getBot();
    };

    this.commands.cancel = (self, params) => {
      self.fsm.stop();
      const commandArray = [];
      commandArray.push({
        postCallback: () => {
          self.queue.pause();
          self.fsm.stopDone();
        },
      });
      self.queue.queueCommands(commandArray);
      return self.getBot();
    };

    this.commands.park = (self, params) => {
      self.fsm.park();
      try {
        const commandArray = [];
        commandArray.push({
          postCallback: async () => {
            await self.fsm.parkDone();
          },
        });
        self.queue.queueCommands(commandArray);
      } catch (ex) {
        self.fsm.parkFail();
      }
      return self.getBot();
    };

    this.commands.unpark = (self, params) => {
      self.fsm.unpark();
      try {
        const commandArray = [];
        commandArray.push({
          postCallback: async () => {
            await self.fsm.unparkDone();
          },
        });
        self.queue.queueCommands(commandArray);
      } catch (ex) {
        self.fsm.unparkFail();
      }
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

    this.commands.updateState = (self, params) => {
      const event = params.body.event;
      const bot = params.body.bot;

      const theEvent = self.fsmEvents.find((fsmEvent) => {
        return fsmEvent.name === event;
      });

      self.fsm.current = theEvent.from;
      self.fsm[theEvent.name]();
    };

    this.commands.checkSubscription = (self, params) => {
      self.subscribe();
    };
  }
};
