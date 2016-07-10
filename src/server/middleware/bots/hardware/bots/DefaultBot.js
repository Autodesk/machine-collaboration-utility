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

    this.resumeCommands = (self) => {
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

    this.pauseCommands = (self) => {
      return {
        code: 'G4 S1',
        postCallback: async () => {
          self.queue.pause();
          await self.fsm.stopDone();
        },
      };
    };

    this.cancelCommands = (self) => {
      return {
        code: 'G4 S1',
        postCallback: async () => {
          self.queue.pause();
          await self.fsm.stopDone();
        },
      };
    };

    this.parkCommands = (self) => {
      return {
        code: 'G4 S1',
        postCallback: async () => {
          await self.fsm.parkDone();
        },
      };
    };

    this.unparkCommands = (self) => {
      return {
        code: 'G4 S1',
        postCallback: async () => {
          await self.fsm.unparkDone();
        },
      };
    };
  }

};
