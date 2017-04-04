const Koa = require('koa');
const cors = require('koa-cors');
const convert = require('koa-convert');
const bodyparser = require('koa-bodyparser');
const json = require('koa-json');
const serve = require('koa-static');
const winston = require('winston');
const IO = require('koa-socket');
const path = require('path');
const Sequelize = require('sequelize');
const router = require('koa-router')();
const _ = require('lodash');
const stringify = require('json-stringify-safe');
const Promise = require('bluebird');
const exec = require('child_process').exec;

const React = require('react');
const renderToString = require('react-dom/server').renderToString;
const match = require('react-router').match;
const RouterContext = require('react-router').RouterContext;

// NOTE THIS FILE IS BUILT BY GULP
const routes = require('../dist/react/routes');

const Files = require('./middleware/files');
const Jobs = require('./middleware/jobs');
const Bots = require('./middleware/bots');

/**
 * renderPage()
 *
 * Render a string that will represent the UI
 * Used by client to render the React app
 *
 * @param {string} appHtml - The entire React app as rendered by the server
 * @param {object} jsVariables - a copy of the variables passed to the server.
 *
 * @returns {string}
 */
function renderPage(appHtml, jsVariables = {}) {
  return `<!doctype html public="storage">
<html>
<meta charset=utf-8/>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Machine Collaboration Utility</title>
<link rel="icon" type="image/png" href="/images/logo.ico" />
<link rel=stylesheet href=/styles.css>
<div id=app><div>${appHtml}</div></div>
<script src="/vendorJs/jquery.min.js"></script>
<script>var APP_VAR=${stringify(jsVariables)}</script>
<script src="/vendorJs/bootstrap.min.js"></script>
<script src="/vendorJs/socket.io.js"></script>
<script src="/bundle.js"></script>
</html>
`;
}

 /**
  * koaApp()
  *
  * Sets up the application's middleware
  *
  * @param {object} config - configuration object, passed from server
  *
  * @returns {koa object} - App to be used by the server
  */
async function koaApp(config) {
  // Setup logger
  const filename = path.join(__dirname, `../${config.logFileName}`);
  const logger = new (winston.Logger)({
    level: 'debug',
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)({ filename }),
    ],
  });

  const app = new Koa();

  app.context.config = config;
  app.context.logger = logger;

  // Add middleware

  // on 'error' is the first middleware in the koa middleware stack, should this be moved to later?
  app.on('error', (error, ctx) => {
    app.context.logger.error('server error', error, ctx);
  });
  app.use(convert(cors()));
  app.use(convert(bodyparser()));
  app.use(convert(json()));
  app.use(convert(serve(path.join(__dirname, '../dist/clientAssets'))));

  // attach socket middleware
  const io = new IO();
  io.attach(app);

  // attach database context
  const sequelize = new Sequelize(`postgres://${process.env.username}:${process.env.password}@localhost:5432/${process.env.dbname}`);

  // check database connection
  let err;
  try {
    err = await sequelize.authenticate();
  } catch (ex) {
    app.context.logger.error('Sequelize authentication error', ex);
  }

  if (err) {
    const errorMessage = `Unable to connect to the database: ${err}`;
    app.context.logger.error(err);
    throw (errorMessage);
  } else {
    app.context.db = sequelize;
  }

  // add custom middleware here
  const files = new Files(app, `/${config.apiVersion}/files`);
  try {
    await files.initialize();
  } catch (ex) {
    app.context.logger.error('"Files" middleware initialization error', ex);
  }

  const jobs = new Jobs(app, `/${config.apiVersion}/jobs`);
  try {
    await jobs.initialize();
  } catch (ex) {
    app.context.logger.error('"Jobs" middleware initialization error', ex);
  }

  const bots = new Bots(app, `/${config.apiVersion}/bots`);
  try {
    await bots.initialize();
  } catch (ex) {
    app.context.logger.error('"Bots" middleware initialization error', ex);
  }

  // Set up Koa to match any routes to the React App. If a route exists, render it.
  router.get('*', (ctx) => {
    try {
      match({ routes, location: ctx.req.url }, (error, redirect, props) => {
        if (error) {
          logger.error(`Server routing error: ${err}`);
          ctx.status = 500;
          ctx.body = err.message;
        } else if (redirect) {
          ctx.redirect(redirect.pathname + redirect.search);
          // Don't render anything if you are requesting an api url
          // aka anything with a url "/v1"
        } else if (
          ctx.req.headers &&
          ctx.req.headers.referer &&
          ctx.req.headers.referer.indexOf('/v1') !== -1
        ) {
          return;
        } else if (props) {
          // Populate react variables to be passed to the client
          // so that they match the variables used by server-side rendering
          const serverProps = {
            files: files.getFiles(),
            jobs: jobs.getJobs(),
            bots: bots.getBots(),
            botPresets: bots.getBotPresets(),
          };
          _.extend(props.params, serverProps);
          const appHtml = renderToString(React.createElement(RouterContext, props));
          ctx.body = renderPage(appHtml, serverProps);
        } else {
          ctx.redirect('/');
        }
      });
    } catch (ex) {
      app.context.logger.error(ex);
      ctx.body = 'Server Error';
      ctx.status = 500;
    }
  });

  router.post('/restart', (ctx) => {
    process.exit(1);
    ctx.body = 'Restarting';
  });

  // Latch the defined routes to the koa app
  app.use(router.routes(), router.allowedMethods());

  app.on('error', (error, ctx) => {
    app.context.logger.error('server error', error, ctx);
  });

  app.context.logger.info('Machine Collaboration Utility has been initialized successfully.');

  return app;
}

module.exports = koaApp;
