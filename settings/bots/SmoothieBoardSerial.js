const _ = require(`underscore`);

const Marlin = require(`./Marlin`);

const SmoothieBoard = function SmoothieBoard(app) {
  Marlin.call(this, app);

  _.extend(this.settings, {
    name: `Smoothie Board Serial`,
    model: `SmoothieBoardSerial`,
  });

  _.extend(this.info, {
    vid: 7504,
    pid: 24597,
    baudrate: 230400,
  });
};

module.exports = SmoothieBoard;
