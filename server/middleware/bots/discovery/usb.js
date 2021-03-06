let usb;
let SerialPort;
const bluebird = require('bluebird');

if (process.env.NODE_ENV !== 'test') {
  usb = bluebird.promisifyAll(require('usb'));
  SerialPort = require('serialport');
}

const _ = require('lodash');

const Bot = require('../bot');

const UsbDiscovery = function (app) {
  this.app = app;
  this.config = app.context.config;

  this.botPresetList = app.context.bots.botPresetList;
  this.ports = {};
};

UsbDiscovery.prototype.substituteSerialNumberForPnpId = function (port) {
  if (port.pnpId === undefined) {
    if (port.serialNumber !== undefined) {
      port.pnpId = port.serialNumber;
    }
  }
  return port;
};

UsbDiscovery.prototype.initialize = async function initialize() {
  const self = this;
  usb.on('attach', async () => {
    // Need to wait arbitrary amount of time for Serialport list to update
    await bluebird.delay(2000);
    SerialPort.list((err, ports) => {
      ports = ports.map(this.substituteSerialNumberForPnpId);
      // Compare every available port against every known port
      for (const port of ports) {
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
    await bluebird.delay(2000);
    const portsToRemove = [];
    SerialPort.list(async (err, ports) => {
      ports = ports.map(this.substituteSerialNumberForPnpId);
      // Go through every known port
      for (const [portKey, listedPort] of _.entries(self.ports)) {
        const foundPort = ports.find(
          port =>
            port.comName === listedPort.comName &&
            port.vendorId !== undefined &&
            port.productId !== undefined,
        );

        // If the listedPort isn't in the serial port's available ports
        // we know that that port was removed
        // Now do all the steps to remove it
        if (foundPort === undefined) {
          const removedBot = _.find(
            self.app.context.bots.botList,
            bot => bot.port === listedPort.comName,
          );
          if (removedBot !== undefined) {
            portsToRemove.push(portKey);
            await removedBot.commands.unplug(removedBot);
            // If we have a generic usb connection and not
            // a persistent pnpid connection, then delete it
            if (self.app.context.bots.botList[removedBot.settings.uuid] !== undefined) {
              delete self.app.context.bots.botList[removedBot.settings.uuid];
              self.app.io.broadcast('botEvent', {
                uuid: removedBot.settings.uuid,
                event: 'delete',
                data: null,
              });
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
    ports = ports.map(this.substituteSerialNumberForPnpId);
    for (const port of ports) {
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
};

UsbDiscovery.prototype.detectPort = async function detectPort(port) {
  const vid = parseInt(port.vendorId, 16);
  const pid = parseInt(port.productId, 16);

  for (const [botPresetKey, botPresets] of _.entries(this.app.context.bots.botPresetList)) {
    if (botPresets.info.connectionType === 'serial') {
      for (const vidPid of botPresets.info.vidPid) {
        // Don't process a greedy, undefined vid pid
        if (vidPid.vid === -1 && vidPid.pidlin === -1) {
          return;
        }

        // Allow printers to ignore the vendor id or product id by setting to -1
        if (
          (vid === vidPid.vid || vidPid.vid === -1) &&
          (pid === vidPid.pid || vidPid.pid === -1)
        ) {
          // Pass the detected preset to populate new settings
          const persistentCheck = await this.checkForPersistentSettings(port, botPresets);
          let botObject;
          if (persistentCheck.original) {
            botObject = await this.app.context.bots.createPersistentBot(
              persistentCheck.foundPresets.settings,
            );
          } else {
            botObject = await this.app.context.bots.createBot(
              persistentCheck.foundPresets.settings,
            );
          }
          botObject.setPort(port.comName);
          botObject.discover({ realHardware: true });
          return;
        }
      }
    }
  }
};

// compare the bot's pnpId with all of the bots in our database
// if a pnpId exists, lost the bot with those settings, otherwise pull from a generic bot
UsbDiscovery.prototype.checkForPersistentSettings = async function checkForPersistentSettings(
  port,
  botPresets,
) {
  let foundPresets;
  let original = false;
  const availableBots = await this.app.context.bots.BotModel.findAll();
  const savedDbProfile = availableBots.find(
    bot => port.pnpId && bot.dataValues.endpoint === port.pnpId,
  );

  if (savedDbProfile !== undefined) {
    foundPresets = await this.app.context.bots.createBot(savedDbProfile.dataValues);
  } else {
    // If pnpid or serial number, need to add it to the database
    // else set port to port
    foundPresets = botPresets;
    if (port.pnpId !== undefined) {
      foundPresets.settings.endpoint = port.pnpId;
      original = true;
    }
  }
  return { foundPresets, original };
};

module.exports = UsbDiscovery;
