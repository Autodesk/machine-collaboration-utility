module.exports = function resolveWarning(self, params) {
  try {
    const warning = params.warning;
    if (!warning) {
      throw new Error('Warn param "warning" is not defined');
    }

    const command = `${warning}Resolve`;

    if (typeof self.commands[command] !== 'function') {
      throw new Error(`Resolve Warning "${warning}" is not supported`);
    }

    self.commands[command](self, params);
  } catch (ex) {
    throw ex;
  }
  return self.getBot();
};
