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
const Promise = require(`bluebird`);

// Import custom middleware libraries
const Files = require('./middleware/files');
const Jobs = require('./middleware/jobs');
const Bot = require('./middleware/bot');
const Conductor = require('./middleware/conductor');
const UI = require('./middleware/ui');

class KoaApp {
  constructor(config, conducting) {
    this.app = new Koa();
    this.app.context.config = config;
    this.conducting = conducting;
  }

  initialize() {
    // Setup logger
    const filename = path.join(__dirname, `../../${this.app.context.config.logFileName}`);
    this.app.context.logger = new (winston.Logger)({
      level: 'debug',
      transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename }),
      ],
    });

    // Add middleware
    this.app.use(convert(cors()));
    this.app.use(convert(bodyparser()));
    this.app.use(convert(json()));
    this.app.use(convert(serve(path.join(__dirname, '../client'))));

    // set jade render path
    this.app.use(convert(views(path.join(__dirname, './views'), {
      root: path.join(__dirname, './views'),
      default: 'jade',
    })));

    // set ctx function for rendering jade
    this.app.use(async (ctx, next) => {
      ctx.render = co.wrap(ctx.render);
      await next();
    });

    // attach socket middleware
    const io = new IO();
    io.attach(this.app);

    // attach database context
    const sequelize = new Sequelize(`postgres://${process.env.username}:${process.env.password}@localhost:5432/${process.env.dbname}`);

    // check database connection
    sequelize.authenticate().then((err) => {
      if (err) {
        this.app.context.logger.error('Unable to connect to the database:', err);
      } else {
        this.app.context.db = sequelize;
      }
    })
    // add custom middleware here
    .then(async () => {
      const apiVersion = `/v1`;
      const files = new Files(this.app, `${apiVersion}/files`);
      await files.initialize();

      const jobs = new Jobs(this.app, `${apiVersion}/jobs`);
      await jobs.initialize();

      if (this.conducting) {
        const conductor = new Conductor(this.app, `${apiVersion}/conductor`);
        await conductor.initialize();
      } else {
        const bot = new Bot(this.app, `${apiVersion}/bot`, process.env.EXTERNAL_ENDPOINT);
        await bot.initialize();
      }

      const ui = new UI(this.app, ``);
      await ui.initialize();

      this.app.context.logger.info('Hydraprint has been initialized successfully.');
    });

    this.app.on('error', (err, ctx) => {
      this.app.context.logger.error('server error', err, ctx);
    });
  }
}

module.exports = KoaApp;
