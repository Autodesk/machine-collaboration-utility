const Promise = require(`bluebird`);

class FakeMarlin {
  constructor(app) {
    this.logger = app.context.logger;
  }

  async write(string) {
    await Promise.delay(100);
    this.logger.info(`string received: ${string}`);
    return `ok`;
  }
}

module.exports = FakeMarlin;
