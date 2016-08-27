const Promise = require('bluebird');
const Sequelize = require('sequelize');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');

module.exports = bsync((app) => {
  const BotModel = app.context.db.define('Bot', {
    model: Sequelize.STRING,
    name: Sequelize.STRING,
    uuid: Sequelize.STRING,
    endpoint: Sequelize.STRING,
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
    conductorX: Sequelize.STRING,
    conductorY: Sequelize.STRING,
  });

  return BotModel;
});
