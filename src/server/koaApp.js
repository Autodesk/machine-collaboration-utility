const co = require(`co`);
const Koa = require(`koa`);
const cors = require(`koa-cors`);
const convert = require(`koa-convert`);
const bodyparser = require(`koa-bodyparser`);
const json = require(`koa-json`);
const serve = require('koa-static');
const views = require('koa-views');
const winston = require(`winston`);
const IO = require(`koa-socket`);
const path = require(`path`);
const Sequelize = require(`sequelize`);
const router = require(`koa-router`)();

const React = require(`react`);
const renderToString = require(`react-dom/server`).renderToString;
const match = require(`react-router`).match;
const RouterContext = require(`react-router`).RouterContext;

// NOTE THIS FILE IS COPIED IN BY GULP FROM CLIENT/JS
const routes = require(`./react/modules/routes`);

const Files = require(`./middleware/files`);
const Jobs = require(`./middleware/jobs`);
const Bots = require(`./middleware/bots`);
const Conductor = require(`./middleware/conductor`);

function renderPage(appHtml) {
  return `
    <!doctype html public="storage">
    <html>
    <meta charset=utf-8/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Hydra-Print</title>
    <link rel=stylesheet href=/styles.css>
    <div id=app>${appHtml}</div>
    <script src="/bundle.js"></script>
   `;
}

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
    this.app.use(convert(serve(path.join(__dirname, `../client`))));

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

      const conductor = new Conductor(this.app, `/${this.apiVersion}/conductor`);
      await conductor.initialize();

      // Set up Koa to match any routes to the React App. If a route exists, render it.
      router.get('*', (ctx) => {
        match({ routes, location: ctx.req.url }, (err, redirect, props) => {
          if (err) {
            ctx.status = 500;
            ctx.body = err.message;
          } else if (redirect) {
            ctx.redirect(redirect.pathname + redirect.search);
          } else if (props) {
            const appHtml = renderToString(<RouterContext {...props}/>);
            ctx.body = renderPage(appHtml);
          } else {
            ctx.status = 404;
            ctx.body = 'Not Found';
          }
        });
      });

      this.app.use(router.routes(), router.allowedMethods());

      this.app.context.logger.info(`Hydra-Print has been initialized successfully.`);
    });

    this.app.on(`error`, (err, ctx) => {
      this.app.context.logger.error(`server error`, err, ctx);
    });
  }
}

module.exports = KoaApp;
