module.exports = function discover(self, params) {
  const state = self.fsm.current;
  if (self.fsm.current !== 'uninitialized') {
    throw new Error(`Cannot discover from state "${state}"`);
  }
  // Should we ever call this function or should it just happen automatically?
  // Currently hacking it to happen automatically
  self.fsm.discover();

  return self.getBot();
};
