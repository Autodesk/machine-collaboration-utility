const Sequelize = require('sequelize');

module.exports = (app) => {
  // Define the model for a job
  const Job = app.context.db.define('Job', {
    botId: Sequelize.STRING,
    uuid: Sequelize.STRING,
    state: Sequelize.STRING,
    fileUuid: Sequelize.STRING,
    started: Sequelize.STRING,
    elapsed: Sequelize.STRING,
    percentComplete: Sequelize.FLOAT,
  });

  // Update the database tables to contain 'Task'
  app.context.db.sync();
  return Job;
};
