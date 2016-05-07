const co = require(`co`);
const Koa = require(`koa`);
const cors = require(`koa-cors`);
const convert = require(`koa-convert`);
const bodyparser = require(`koa-bodyparser`);
const json = require(`koa-json`);
const winston = require(`winston`);
const IO = require(`koa-socket`);
const path = require(`path`);
const Sequelize = require(`sequelize`);

const Files = require(`./middleware/files`);
const Jobs = require(`./middleware/jobs`);
const Bots = require(`./middleware/bots`);

class KoaApp {
  constructor(config) {
    this.app = new Koa();
    this.app.context.config = config;
    this.apiVersion = config.apiVersion;
  }

  initialize() {
    // Setup logger
    const filename = path.join(__dirname, `../../${this.app.context.config.logFileName}`);
    this.app.context.logger = new (winston.Logger)({
      level: `debug`,
      transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename }),
      ],
    });

    // Add middleware
    this.app.use(convert(cors()));
    this.app.use(convert(bodyparser()));
    this.app.use(convert(json()));
    // this.app.use(convert(serve(path.join(__dirname, `../client`))));

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
        const errorMessage = `Unable to connect to the database: ${err}`;
        this.app.context.logger.error(err);
        throw (errorMessage);
      } else {
        this.app.context.db = sequelize;
      }
    })
    // add custom middleware here
    .then(async () => {
      const files = await new Files(this.app, `/${this.apiVersion}/files`);
      await files.initialize();

      const jobs = new Jobs(this.app, `/${this.apiVersion}/jobs`);
      await jobs.initialize();

      const bots = new Bots(this.app, `/${this.apiVersion}/bots`);
      await bots.initialize();

      this.app.context.logger.info(`Hydra-Print has been initialized successfully.`);
    });

    this.app.on(`error`, (err, ctx) => {
      this.app.context.logger.error(`server error`, err, ctx);
    });
  }
}

module.exports = KoaApp;
