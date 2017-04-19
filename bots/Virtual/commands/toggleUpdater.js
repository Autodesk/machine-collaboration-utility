module.exports = function toggleUpdater(self, params) {
  if (self.updateInterval === undefined) {
    self.updateInterval = false;
  }

  const update = params.update;
  if (update === undefined) {
    throw new Error('"update" is not defined');
  }

  if (update) {
    if (self.updateInterval === false) {
      self.updateInterval = setInterval(() => {
        self.commands.updateRoutine(self);
      }, 2000);
    }
    return 'Bot update routine is on';
  }

  if (self.updateInterval !== false) {
    clearInterval(self.updateInterval);
    self.updateInterval = false;
  }

  return 'Bot update routine is off';
};
