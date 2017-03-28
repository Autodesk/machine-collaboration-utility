module.exports = function initialize(self, params) {
  self.queue = undefined;
  self.currentJob = undefined;
  self.lr = undefined; // buffered file line reader
  self.currentLine = undefined;
  self.isDry = false;  // keep track of if we need to purge

  self.status = {
    sensors: {
      t0: undefined,
    },
    position: {
      x: undefined,
      y: undefined,
      z: undefined,
      e: undefined,
    },
  };
}
