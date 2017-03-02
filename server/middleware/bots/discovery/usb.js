const Promise = require('bluebird');

let usb;
let SerialPort;

if (process.env.NODE_ENV !== 'test') {
  usb = Promise.promisifyAll(require('usb'));
  SerialPort = require('serialport');
}

const _ = require('underscore');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');

const Bot = require('../bot');

const UsbDiscovery = function(app) {
  this.app = app;
  this.config = app.context.config;
  this.logger = app.context.logger;

  this.botPresetList = app.context.bots.botPresetList;
  this.ports = {};
};

UsbDiscovery.prototype.substituteSerialNumberForPnpId = function(port) {
  if (port.pnpId === undefined) {
    if (port.serialNumber !== undefined) {
      port.pnpId = port.serialNumber;
    }
  }
  return port;
};

UsbDiscovery.prototype.initialize = bsync(function initialize() {
  const self = this;
  usb.on('attach', bsync(() => {
    // Need to wait arbitrary amount of time for Serialport list to update
    bwait(Promise.delay(100));
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
  }));

  usb.on('detach', bsync(() => {
    // Need to wait arbitrary amount of time for Serialport list to update
    bwait(Promise.delay(100));
    const portsToRemove = [];
    SerialPort.list(bsync((err, ports) => {
      ports = ports.map(this.substituteSerialNumberForPnpId);
      // Go through every known port
      for (const [portKey, listedPort] of _.pairs(self.ports)) {
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
            bwait(removedBot.commands.unplug(removedBot));
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
    }));
  }));

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
});

UsbDiscovery.prototype.detectPort = bsync(function detectPort(port) {
  const vid = parseInt(port.vendorId, 16);
  const pid = parseInt(port.productId, 16);

  for (const [botPresetKey, botPresets] of _.pairs(this.app.context.bots.botSettingList)) {
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
          const persistentCheck = bwait(this.checkForPersistentSettings(port, botPresets));
          let botObject;
          if (persistentCheck.original) {
            botObject = bwait(this.app.context.bots.createPersistentBot(persistentCheck.foundPresets.settings));
          } else {
            botObject = bwait(this.app.context.bots.createBot(persistentCheck.foundPresets.settings));
          }
          botObject.setPort(port.comName);
          botObject.detect();
          return;
        }
      }
    }
  }
});

// compare the bot's pnpId with all of the bots in our database
// if a pnpId exists, lost the bot with those settings, otherwise pull from a generic bot
UsbDiscovery.prototype.checkForPersistentSettings = bsync(function checkForPersistentSettings(port, botPresets) {
  let foundPresets = undefined;
  let original = false;
  const availableBots = bwait(this.app.context.bots.BotModel.findAll());
  const savedDbProfile = availableBots.find((bot) => {
    return port.pnpId && bot.dataValues.endpoint === port.pnpId;
  });

  if (savedDbProfile !== undefined) {
    foundPresets = bwait(this.app.context.bots.createBot(savedDbProfile.dataValues));
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
});

module.exports = UsbDiscovery;
