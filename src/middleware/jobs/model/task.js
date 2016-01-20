const Sequelize = require('sequelize');

module.exports = async (app) => {
  // Define the model for Task
  const Task = await app.context.db.define('Task', {
    description: Sequelize.STRING,
  });

  // Update the database tables to contain 'Task'
  await app.context.db.sync();
  return Task;
};
