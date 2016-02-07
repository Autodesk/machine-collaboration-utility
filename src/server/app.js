const co = require('co');
const Koa = require('koa');
const cors = require('koa-cors');
const convert = require('koa-convert');
const bodyparser = require('koa-bodyparser');
const json = require('koa-json');
const winston = require('winston');
const serve = require('koa-static');
const views = require('koa-views');
const IO = require('koa-socket');
const path = require('path');
const Sequelize = require('sequelize');

// Import custom middleware libraries
const Files = require('./middleware/files');
const Jobs = require('./middleware/jobs');
const Client = require('./middleware/client');
const UI = require('./middleware/ui');
const config = require('./config');

// Create Koa app
const app = new Koa();

try {
  // Setup logger
  const filename = path.join(__dirname, `../../${config.logFileName}`);
  app.context.logger = new (winston.Logger)({
    level: 'debug',
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)({ filename }),
    ],
  });

  // Add middleware
  app.use(convert(cors()));
  app.use(convert(bodyparser()));
  app.use(convert(json()));
  app.use(convert(serve(path.join(__dirname, '../client'))));

  // set jade render path
  app.use(convert(views(path.join(__dirname, './views'), {
    root: path.join(__dirname, './views'),
    default: 'jade',
  })));

  // set ctx function for rendering jade
  app.use(async (ctx, next) => {
    ctx.render = co.wrap(ctx.render);
    await next();
  });

  // attach socket middleware
  const io = new IO();
  io.attach(app);

  // attach database context
  const sequelize = new Sequelize(`postgres://${process.env.username}:${process.env.password}@localhost:5432/${process.env.dbname}`);

  // check database connection
  sequelize.authenticate().then((err) => {
    if (err) {
      app.context.logger.error('Unable to connect to the database:', err);
    } else {
      app.context.db = sequelize;
    }
  })
  // add custom middleware here
  .then(async () => {
    const apiVersion = `/v1`;
    const files = new Files(app, `${apiVersion}/files`);
    await files.initialize();

    const jobs = new Jobs(app, `${apiVersion}/jobs`);
    await jobs.initialize();

    const client = new Client(app, `${apiVersion}/client`);
    await client.initialize();

    const ui = new UI(app, ``);
    await ui.initialize();

    app.context.logger.info('Hydraprint has been initialized successfully.');
  });

  app.on('error', (err, ctx) => {
    app.context.logger.error('server error', err, ctx);
  });

  module.exports = app;
} catch (ex) {
  app.context.logger.error(`Catchall App Error Handler:`, ex);
}
