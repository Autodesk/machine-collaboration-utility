const Sequelize = require('sequelize');

module.exports = async (app) => {
  // Define the model for a job
  const Bot = await app.context.db.define('Bot', {
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

  // Update the database tables to contain 'Bot'
  await app.context.db.sync();
  return Bot;
};
