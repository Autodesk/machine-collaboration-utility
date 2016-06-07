const Promise = require(`bluebird`);
const usb = Promise.promisifyAll(require(`usb`));
const SerialPort = require(`serialport`);
const _ = require(`underscore`);

const Bot = require(`../bot`);

class UsbDiscovery {
  constructor(app) {
    this.app = app;
    this.config = app.context.config;
    this.logger = app.context.logger;

    this.botPresetList = app.context.bots.botPresetList;
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
          // Ignore ports with undefined vid pids
          if (port.vendorId !== undefined && port.productId !== undefined) {
            // If the port isn't on our list of known ports, then we need to add it
            if (self.ports[port.comName] === undefined) {
              self.ports[port.comName] = port;
              self.detectPort(port);
            }
          }
        }
      });
    });

    usb.on('detach', async () => {
      // Need to wait arbitrary amount of time for Serialport list to update
      await Promise.delay(100);
      const portsToRemove = [];
      SerialPort.list(async (err, ports) => {
        // Go through every known port
        for (const portKey in self.ports) {
          if (self.ports.hasOwnProperty(portKey)) {
            const listedPort = self.ports[portKey];
            const foundPort = ports.find((port) => {
              return (
                port.comName === listedPort.comName &&
                port.vendorId !== undefined &&
                port.productId !== undefined
              );
            });
            // If the listedPort isn't in the serial port's available ports
            // we know that that port was removed
            // Now do all the steps to remove it
            if (foundPort === undefined) {
              const removedBot = _.find(self.app.context.bots.botList, (bot) => {
                return bot.port === listedPort.comName;
              });
              if (removedBot !== undefined) {
                portsToRemove.push(portKey);
                await removedBot.unplug();
                // If we have a generic usb connection and not
                // a persistent pnpid connection, then delete it
                const portUniqueIdentifier = self.app.context.bots.sanitizeStringForRouting(removedBot.port);
                if (self.app.context.bots.botList[portUniqueIdentifier] !== undefined) {
                  delete self.app.context.bots.botList[portUniqueIdentifier];
                }
              }
            }
          }
        }
        // Need to remove the port after cycling through the for loop
        for (const port of portsToRemove) {
          delete self.ports[port];
        }
      });
    });

    // Scan through all known serial ports and check if any of them are bots
    SerialPort.list((err, ports) => {
      for (let i = 0; i < ports.length; i++) {
        const port = ports[i];
        if (port.vendorId !== undefined && port.productId !== undefined) {
          // Add each known serial port to the list
          // Even if we don't want to use a ports, we need to add it to a list of known ports
          // so that when a port is unplugged later, we can reference the list of known ports
          // against the list of available ports, and determine which port was unplugged
          self.ports[port.comName] = port;
          self.detectPort(port);
        }
      }
    });
  }

  async detectPort(port) {
    const vid = parseInt(port.vendorId, 16);
    const pid = parseInt(port.productId, 16);

    for (const botPresetKey in this.botPresetList) {
      const botPresets = this.botPresetList[botPresetKey];
      if (vid === botPresets.vid && pid === botPresets.pid) {
        // Pass the detected preset to populate new settings
        const detectedBotSettings = await this.checkForPersistentSettings(port, botPresets);
        const botObject = new Bot(this.app, detectedBotSettings);
        botObject.setPort(port.comName);
        let cleanUniqueIdentifier;
        if (botObject.settings.uniqueIdentifier === `default`) {
          cleanUniqueIdentifier = this.app.context.bots.sanitizeStringForRouting(botObject.port);
        } else {
          cleanUniqueIdentifier = this.app.context.bots.sanitizeStringForRouting(botObject.settings.uniqueIdentifier);
        }
        this.app.context.bots.botList[cleanUniqueIdentifier] = botObject;
        botObject.detect();
      }
    }
  }

  // compare the bot's pnpId with all of the bots in our database
  // if a pnpId exists, lost the bot with those settings, otherwise pull from a generic bot
  async checkForPersistentSettings(port, botPresets) {
    let detectedBotSettings = undefined;
    const availableBots = await this.app.context.bots.BotModel.findAll();
    const savedDbProfile = availableBots.find((bot) => {
      return port.pnpId && bot.dataValues.uniqueIdentifier === port.pnpId;
    });

    if (savedDbProfile !== undefined) {
      const savedProfile = this.app.context.bots.parseDbBotSettings(savedDbProfile);
      detectedBotSettings = await this.app.context.bots.createBot(savedProfile);
    } else {
      // If pnpid or serial number, need to add it to the database
      // else set port to port
      if (port.pnpId !== undefined) {
        botPresets.settings.uniqueIdentifier = port.pnpId;
      }
      detectedBotSettings = botPresets.settings;
    }
    return detectedBotSettings;
  }
}

module.exports = UsbDiscovery;
