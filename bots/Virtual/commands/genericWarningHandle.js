// When we receive a generic warning, we want to add the warning to the Warning Array
// If we're idle, just add the warning
// If we're processing the job, add the warning and pause the job
// If we're transitioning, push the warning and pause commands into the queue

function addWarning(self) {
  const warningObject = {
    type: 'genericWarning',
    time: new Date(),
    state: String(self.fsm.current),
  };

  const existingWarning = self.warnings.find((warning) => {
    return warning.type === warningObject.type;
  });

  if (!existingWarning) {
    console.log('sweet warning object', warningObject);
    self.warnings.push(warningObject);
  }
}

module.exports = function genericWarningHandle(self) {
  switch (self.fsm.current) {
    case 'idle': {
      addWarning(self);
      break;
    }
    case 'executingJob': {
      addWarning(self);
      self.commands.pause(self);
      break;
    }
    case 'pausing': {
      self.queue.queueCommands({
        preCallback: () => {
          addWarning(self);
        },
      });
      break;
    }
    default: {
      break;
    }
  }
};
