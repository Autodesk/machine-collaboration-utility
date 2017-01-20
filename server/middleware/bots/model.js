const Sequelize = require('sequelize');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');

module.exports = bsync((app) => {
  const BotModel = app.context.db.define('Bot', {
    model: Sequelize.STRING,
    name: Sequelize.STRING,
    uuid: Sequelize.UUID,

    // The identifier is either an ip address endpoint or a pnpid
    endpoint: Sequelize.STRING,

    jogXSpeed: Sequelize.INTEGER,
    jogYSpeed: Sequelize.INTEGER,
    jogZSpeed: Sequelize.INTEGER,
    jogESpeed: Sequelize.INTEGER,
    tempE: Sequelize.INTEGER,
    tempB: Sequelize.INTEGER,
    speedRatio: Sequelize.FLOAT,
    eRatio: Sequelize.FLOAT,
    offsetX: Sequelize.FLOAT,
    offsetY: Sequelize.FLOAT,
    offsetZ: Sequelize.FLOAT,
    openString: Sequelize.STRING,
    custom: Sequelize.STRING,
    bedMeshXPoints: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.FLOAT),
    bedMeshYPoints: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.FLOAT),
    bedMeshZPoints: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.FLOAT)
  });

  return BotModel;
});
