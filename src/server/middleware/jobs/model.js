const Sequelize = require('sequelize');

module.exports = async (app) => {
  // Define the model for a job
  const JobModel = await app.context.db.define('Job', {
    uuid: Sequelize.STRING,
    botUuid: Sequelize.STRING,
    fileUuid: Sequelize.STRING,
    state: Sequelize.STRING,
    started: Sequelize.STRING,
    elapsed: Sequelize.STRING,
    percentComplete: Sequelize.FLOAT,
  });

  return JobModel;
};
