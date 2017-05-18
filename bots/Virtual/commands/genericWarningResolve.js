/* global logger */
// When we receive a generic warning, we want to add the warning to the Warning Array
// If we're idle, just add the warning
// If we're processing the job, add the warning and pause the job
// If we're transitioning, push the warning and pause commands into the queue

function removeWarning(self, params) {
  // look to see if the warning type exists
  // if it does, remove it
  let removedWarning = null;

  const warningIndex = self.warnings.findIndex((warning) => {
    return warning.type === params.warning;
  });

  if (warningIndex !== undefined) {
    removedWarning = self.warnings.splice(warningIndex, 1)[0];
  }

  return removedWarning;
}

function handleRemovedWarning(self, params) {
  const removedWarning = removeWarning(self, params);
  if (removedWarning && removedWarning.state !== self.fsm.current) {
    switch (removedWarning.state) {
      case 'paused': {
        // Nothing to do, just remove the warning
        break;
      }
      case 'blocked':
      case 'executingJob': {
        self.commands.resume(self);
        break;
      }
      default: {
        logger.error('Should never end up in state', self.fsm.current);
        break;
      }
    }
  }
}

module.exports = function genericWarningResolve(self, params) {
  switch (self.fsm.current) {
    case 'idle': {
      removeWarning(self, params);
      break;
    }
    case 'pausing': {
      self.queue.queueCommands({
        preCallback: () => {
          handleRemovedWarning(self, params);
        },
      });
      break;
    }
    case 'paused': {
      handleRemovedWarning(self, params);
      break;
    }
    default: {
      break;
    }
  }
};
