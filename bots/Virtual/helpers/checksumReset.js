module.exports = function checksumReset(self) {
  let command = 'M110';
  switch (self.settings.model) {
    case 'Clever':
      command = 'M110 N0';
      break;
    case 'TitanCronus':
      command = 'N0 M110';
      break;
    case 'Prusa':
      command = 'M110';
      break;
    default:
      logger.warn('Model M110 switch case not found');
      break;
  }
  return command;
};
