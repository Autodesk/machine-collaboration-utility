module.exports = function warn(self, params) {
  try {
    const warning = params.warning;
    if (!warning) {
      throw new Error('Warn param "warning" is not defined');
    }

    const command = `${warning}Handle`;

    if (typeof self.commands[command] !== 'function') {
      throw new Error(`Warning "${warning}" is not supported`);
    }

    self.commands[command](self, params);
  } catch (ex) {
    throw ex;
  }
  return self.getBot();
};
