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
        // Compare every available port against every known port
        for (let i = 0; i < ports.length; i++) {
          const port = ports[i];
          // If the port isn't on our list of known ports, then we need to add it
          if (self.ports[port.comName] === undefined) {
            self.ports[port.comName] = port;
            self.detectPort(port);
          }
        }
      });
    });

    usb.on('detach', async () => {
      // Need to wait arbitrary amount of time for Serialport list to update
      await Promise.delay(100);
      SerialPort.list((err, ports) => {
        // Go through every known port
        for (const listedPort in self.ports) {
          if (self.ports.hasOwnProperty(listedPort)) {
            const foundPort = _.find(ports, (port) => {
              return port.comName === listedPort;
            });
            // if one of the ports from our list isn't in the list of available ports
            // we know that that port was removed
            // now do all the steps to remove it
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

    // Scan through all known serial ports and check if any of them are bots
    SerialPort.list((err, ports) => {
      for (let i = 0; i < ports.length; i++) {
        const port = ports[i];
        // Add each known serial port to the list
        // Even if we don't want to use a ports, we need to add it to a list of known ports
        // so that when a port is unplugged later, we can reference the list of known ports
        // against the list of available ports, and determine which port was unplugged
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
    return comName.replace(/\//g, '_');
  }
}
module.exports = UsbDiscovery;
