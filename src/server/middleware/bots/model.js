const Sequelize = require('sequelize');

module.exports = async (app) => {
  // Define the model for a job
  const BotModel = await app.context.db.define('Bot', {
    model: Sequelize.STRING,
    name: Sequelize.STRING,
    uuid: Sequelize.STRING,
    // The identifier is either an ip address endpoint or a pnpid
    jogXSpeed: Sequelize.STRING,
    jogYSpeed: Sequelize.STRING,
    jogZSpeed: Sequelize.STRING,
    jogESpeed: Sequelize.STRING,
    tempE: Sequelize.STRING,
    tempB: Sequelize.STRING,
    speedRatio: Sequelize.STRING,
    eRatio: Sequelize.STRING,
    offsetX: Sequelize.STRING,
    offsetY: Sequelize.STRING,
    offsetZ: Sequelize.STRING,
  });

  return BotModel;
};
