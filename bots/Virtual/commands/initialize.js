module.exports = function initialize(self, params) {
  self.queue = undefined;
  self.currentJob = undefined;
  self.lr = undefined; // buffered file line reader
  self.currentLine = undefined;
  self.isDry = false;  // keep track of if we need to purge

  self.status = {
    position: {
      x: undefined,
      y: undefined,
      z: undefined,
      e: undefined,
    },
    sensors: {
      t0: {
        temperature: undefined,
        setpoint: undefined,
      },
      b0: {
        temperature: undefined,
        setpoint: undefined,
      },
    },
    checkpoint: undefined,
    collaborators: {},
    blocker: {
      bot: undefined,
      checkpoint: undefined,
    },
  };
}
