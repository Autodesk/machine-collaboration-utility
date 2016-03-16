const Sequelize = require('sequelize');

module.exports = async (app) => {
  // Define the model for a job
  const Bot = await app.context.db.define('Bot', {
    jogX: Sequelize.STRING,
    jogY: Sequelize.STRING,
    jogZ: Sequelize.STRING,
    jogE: Sequelize.STRING,
    tempE: Sequelize.STRING,
    tempB: Sequelize.STRING,
    speed: Sequelize.STRING,
    eRatio: Sequelize.STRING,
  });

  // Update the database tables to contain 'Bot'
  await app.context.db.sync();
  return Bot;
};
