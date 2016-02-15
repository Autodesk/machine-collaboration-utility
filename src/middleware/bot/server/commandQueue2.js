const Promise = require(`bluebird`);

class CommandQueue {
  constructor(app) {
    this.logger = app.context.logger;
    this.commandQueue = [];
    t
  }

  async checkQueue(self) {
    const queueLength = self.commandQueue.length;
    if (queueLength > 0) {
      const command = self.commandQueue.shift();
      console.log(`the command: ${command}`);
      await Promise.delay(1000);
    }
    setImmediate(self.checkQueue(self));
  }

  append(command) {
    this.commandQueue.push(command);
  }

  prepend(command) {
    this.commandQueue.unshift(command);
  }
}

module.exports = CommandQueue;
