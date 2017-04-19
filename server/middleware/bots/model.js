const Sequelize = require('sequelize');

module.exports = async (app) => {
  const BotModel = app.context.db.define('Bot', {
    name: Sequelize.STRING,
    model: Sequelize.STRING,
    uuid: Sequelize.UUID,

    // The identifier is either an ip address endpoint or a pnpid
    endpoint: Sequelize.STRING,
    jogXSpeed: Sequelize.INTEGER,
    jogYSpeed: Sequelize.INTEGER,
    jogZSpeed: Sequelize.INTEGER,
    jogESpeed: Sequelize.INTEGER,
    tempE: Sequelize.INTEGER,
    tempB: Sequelize.INTEGER,
    offsetX: Sequelize.FLOAT,
    offsetY: Sequelize.FLOAT,
    offsetZ: Sequelize.FLOAT,
    openString: Sequelize.STRING,
    custom: Sequelize.TEXT,
  });

  return BotModel;
};
