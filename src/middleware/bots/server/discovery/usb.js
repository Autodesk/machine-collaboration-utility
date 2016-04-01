const Promise = require(`bluebird`);
const usb = Promise.promisifyAll(require(`usb`));
const SerialPort = require(`serialport`);

const Bot = require(`../bot`);

class UsbDiscovery {
  constructor(app) {
    this.app = app;
    this.config = app.context.config;
  }

  async initialize() {
    const self = this;
    usb.on('attach', async (device) => {
      if (self.verifyVidPid(device) && await self.getPort()) {
        // create bot
      }
    });
    usb.on('detach', (device) => {
      if (self.verifyVidPid(device)) {
        // kill all of the bots' currently processing Jobs
        // then remove bot from array
      }
    });
    const devices = await usb.getDeviceList();
    devices.forEach(async (device) => {
      const validVidPid = self.verifyVidPid(device);
      if (validVidPid) {
        const port = await self.getPort();
        if (port) {
          const nullBot = this.app.context.bots.bots[`null`];
          if (nullBot !== undefined) {
            this.app.context.bots.bots[port] = nullBot;
            nullBot.setPort(port);
            delete this.app.context.bots.bots[`null`];
            nullBot.detect(device);
          }
        }
      }
    });
  }

  // Compare a port's vid pid with our bot's vid pid
  verifyVidPid(device) {
    for (let i = 0; i < this.config.vidPids.length; i++) {
      if (
        device.deviceDescriptor.idVendor === this.config.vidPids[i].vid &&
        device.deviceDescriptor.idProduct === this.config.vidPids[i].pid
      ) {
        this.device = device;
        return true;
      }
    }
    return false;
  }

  async getPort() {
    const self = this;
    const portPromise = new Promise((resolve, reject) => {
      // Don't scan the ports if we haven't set a device
      if (self.device === undefined) {
        return reject(false);
      }

      SerialPort.list((err, ports) => {
        for (let i = 0; i < ports.length; i++) {
          const port = ports[i];
          if (
            self.device.deviceDescriptor.idVendor === parseInt(port.vendorId.split('x').pop(), 16) &&
            self.device.deviceDescriptor.idProduct === parseInt(port.productId.split('x').pop(), 16)
          ) {
            return resolve(port.comName);
          }
        }
        return reject(false);
      });
    });
    return await portPromise;
  }
}

module.exports = UsbDiscovery;
