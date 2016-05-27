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
      let portToRemove = undefined;
      SerialPort.list(async (err, ports) => {
        console.log('unplugged ports', ports, self.ports);
        // Go through every known port
        for (const listedPort in self.ports) {
          if (self.ports.hasOwnProperty(listedPort)) {
            const foundPort = ports.find((port) => {
              return (
                port.comName === listedPort &&
                port.vendorId !== undefined &&
                port.productId !== undefined
              );
            });
            // If one of the ports from our list isn't in the list of available ports
            // we know that that port was removed
            // Now do all the steps to remove it
            if (foundPort === undefined) {
              const removedBot = _.find(self.app.context.bots.botList, (bot) => {
                console.log('bot', bot);
                console.log('listedPort', listedPort);
                console.log('self.ports[listedPort]', self.ports[listedPort]);
                return bot.settings.port === listedPort;
              });
              if (removedBot !== undefined) {
                portToRemove = listedPort;
                await removedBot.unplug();
                // If we have a generic usb connection and not a persistent pnpid connection, then delete it
                if (self.app.context.bots.botList[removedBot.settings.comName] !== undefined) {
                  delete self.app.context.bots.botList[removedBot.settings.comName];
                }
              }
            }
          }
        }
        // Need to remove the port after cycling through the for loop
        if (portToRemove !== undefined) {
          delete self.ports[portToRemove];
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

    for (const vidPid of this.config.vidPids) {
      // If the vid pid match what we are looking for then we know we have a bot of interest
      if (vid === vidPid.vid && pid === vidPid.pid) {
        const detectedBotSettings = await this.checkForPersistentSettings(port);
        const botObject = new Bot(this.app, detectedBotSettings);
        this.app.context.bots.botList[detectedBotSettings.port] = botObject;
        botObject.setPort(port.comName);
        botObject.detect();
      }
    }
  }

  // compare the bot's pnpId with all of the bots in our database
  // if a pnpId exists, lost the bot with those settings, otherwise pull from a generic bot
  async checkForPersistentSettings(port) {
    let detectedBotSettings;
    const availableBots = await this.app.context.bots.Bot.findAll();
    const savedDbProfile = availableBots.find((bot) => {
      return bot.dataValues.uniqueEndpoint === port.pnpId;
    });

    if (savedDbProfile !== undefined) {
      const savedProfile = this.app.context.bots.parseDbBotSettings(savedDbProfile);
      detectedBotSettings = this.app.context.bots.createBot(savedProfile);
    } else {
      // If pnpid, need to add it to the database
      // else set port to port
      let botIdentifier;
      if (port.pnpId !== undefined) {
        botIdentifier = port.pnpId;
        detectedBotSettings = this.app.context.bots.createBot({
          port: port.pnpId,
          connectionType: `serial`,
        });
        await this.app.context.bots.Bot.create(detectedBotSettings);
      } else {
        botIdentifier = port.comName;
        detectedBotSettings = this.app.context.bots.createBot({
          port: botIdentifier,
          connectionType: `serial`,
        });
      }
    }
    return detectedBotSettings;
  }
}

module.exports = UsbDiscovery;
