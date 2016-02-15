const usb = require(`usb`);

const UsbScanner = function () {

};

UsbScanner.prototype.scan = function (bot) {
  usb.on('attach', (device) => {
    console.log('the device', device);
  });
  console.log('the bot', bot);
};

module.exports = new UsbScanner();
