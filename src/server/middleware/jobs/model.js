const Sequelize = require('sequelize');

module.exports = async (app) => {
  // Define the model for a job
  const Job = await app.context.db.define('Job', {
    botId: Sequelize.STRING,
    uuid: Sequelize.STRING,
    state: Sequelize.STRING,
    fileUuid: Sequelize.STRING,
    started: Sequelize.STRING,
    elapsed: Sequelize.STRING,
    percentComplete: Sequelize.FLOAT,
  });

  // Update the database tables to contain 'Task'
  await app.context.db.sync({force:true});
  return Job;
};
