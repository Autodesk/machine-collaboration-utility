const Promise = require(`bluebird`);
const usb = Promise.promisifyAll(require(`usb`));
const SerialPort = require(`serialport`);
const _ = require(`underscore`);

class UsbDiscovery {
  constructor(app) {
    this.app = app;
    this.config = app.context.config;
    this.ports = {};
  }

  async initialize() {
    const self = this;
    usb.on('attach', async () => {
      // Need to wait arbitrary amount of time for Serialport list to update
      await Promise.delay(100);
      SerialPort.list((err, ports) => {
        for (let i = 0; i < ports.length; i++) {
          const port = ports[i];
          if (self.ports[port.comName] === undefined) {
            self.ports[port.comName] = port;
            self.detectPort(port);
          }
        }
      });
    });

    usb.on('detach', async (device) => {
      // Need to wait arbitrary amount of time for Serialport list to update
      await Promise.delay(100);
      SerialPort.list((err, ports) => {
        for (const listedPort in self.ports) {
          if (self.ports.hasOwnProperty(listedPort)) {
            const foundPort = _.find(ports, (port) => {
              return port.comName === listedPort;
            });
            if (foundPort === undefined) {
              const botName = self.sanitizePortName(listedPort);
              const removedBot = self.app.context.bots.bots[botName];
              delete self.ports[listedPort];
              this.app.context.bots.bots[`null`] = removedBot;
              removedBot.setPort(`null`);
              delete this.app.context.bots.bots[botName];
              removedBot.unplug();
            }
          }
        }
      });
    });

    SerialPort.list((err, ports) => {
      for (let i = 0; i < ports.length; i++) {
        const port = ports[i];
        self.ports[port.comName] = port;
        self.detectPort(port);
      }
    });
  }

  detectPort(port) {
    const vid = parseInt(port.vendorId, 16);
    const pid = parseInt(port.productId, 16);
    for (const vidPid of this.config.vidPids) {
      if (vid === vidPid.vid && pid === vidPid.pid) {
        const nullBot = this.app.context.bots.bots[`null`];
        if (nullBot !== undefined) {
          const botName = this.sanitizePortName(port.comName);
          this.app.context.bots.bots[botName] = nullBot;
          nullBot.setPort(port.comName);
          delete this.app.context.bots.bots[`null`];
          nullBot.detect(port);
        }
      }
    }
  }

  sanitizePortName(comName) {
    return comName.split('/')[comName.split('/').length - 1];
  }
}
module.exports = UsbDiscovery;
