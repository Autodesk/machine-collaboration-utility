module.exports = function initialize(self) {
  self.queue = undefined;
  self.currentJob = undefined;
  self.lr = undefined; // buffered file line reader
  self.currentLine = undefined;

  // placeholder for storing which possible state to return to after pausing
  self.pauseableState = undefined;
  self.parkedPosition = undefined;

  // Set "parked" flag to false initially
  self.parked = false;

  // placeholder for storing which possible state to return to after receiving a job warning
  self.jobWarningState = undefined;

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
};
