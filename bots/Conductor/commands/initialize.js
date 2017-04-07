module.exports = function initialize(self, params) {
  self.currentJob = undefined;
  self.collaboratorCheckpoints = {};
  // placeholder for storing which possible state to return to after pausing
  self.pauseableState = undefined;

  // placeholder for storing which possible state to return to after receiving a job warning
  self.jobWarningState = undefined;
}
