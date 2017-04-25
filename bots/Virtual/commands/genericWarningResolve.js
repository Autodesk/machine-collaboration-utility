// When we receive a generic warning, we want to add the warning to the Warning Array
// If we're idle, just add the warning
// If we're processing the job, add the warning and pause the job
// If we're transitioning, push the warning and pause commands into the queue

module.exports = function genericWarningResolve(self, params) {
  const warningObject = {
    type: 'generic',
    time: new Date(),
    state: String(self.fsm.current),
  };

  if (self.fsm.current === 'idle') {
    self.warnings.push(warningObject);
  }
};
