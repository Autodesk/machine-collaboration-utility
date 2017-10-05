/* global logger */
const Koa = require('koa');
const cors = require('koa-cors');
const convert = require('koa-convert');
const bodyparser = require('koa-bodyparser');
const koaBody = require('koa-body');
const json = require('koa-json');
const serve = require('koa-static');
const winston = require('winston');
const IO = require('koa-socket');
const path = require('path');
const Sequelize = require('sequelize');
const router = require('koa-router')();
const _ = require('lodash');
const fs = require('fs-promise');
const stringify = require('json-stringify-safe');
const write = require('fs').createWriteStream;
const pack = require('tar-pack').pack;
const exec = require('child_process').exec;
const execPromise = require('exec-then');

const Files = require('./middleware/files');
const Jobs = require('./middleware/jobs');
const Bots = require('./middleware/bots');

async function getHostname() {
  if (process.env.PWD !== '/home/pi/machine-collaboration-utility/') {
    return null;
  }

  const reply = await execPromise('cat /etc/hostname | tr -d " \t\n\r"')
  .catch((execError) => {
    logger.error('Get hostname error', execError);
  });

  if (reply.stdout && typeof reply.stdout === 'string' && reply.stdout.length > 1) {
    const hostname = reply.stdout;
    logger.debug('Found hostname', hostname);
    return hostname;
  }
  return null;
}

async function getAppSettings() {
  const hostname = await getHostname().catch((err) => {
    logger.error('Get Hostname Error', err);
  });
  return { hostname };
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
  const appSettings = await getAppSettings();

  const app = new Koa();
  app.context.config = config;
  // Add middleware
  // on 'error' is the first middleware in the koa middleware stack, should this be moved to later?
  app.on('error', (error, ctx) => {
    logger.error('server error', error, ctx);
  });
  app.use(convert(cors()));
  app.use(convert(bodyparser()));
  app.use(convert(json()));
  app.use(convert(serve(path.join(__dirname, './build'))));

  // attach socket middleware
  const io = new IO();
  io.attach(app);

  // attach database context
  // const sequelize = new Sequelize(`postgres://${process.env.username}:${process.env.password}@localhost:5432/${process.env.dbname}`);
  const sequelize = new Sequelize('mcu', 'mcu', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    },
    storage: './db.sqlite'
  });

  // check database connection
  let err;
  try {
    err = await sequelize.authenticate();
  } catch (ex) {
    logger.error('Sequelize authentication error', ex);
  }

  if (err) {
    const errorMessage = `Unable to connect to the database: ${err}`;
    logger.error(err);
    throw (errorMessage);
  } else {
    app.context.db = sequelize;
  }

  // add custom middleware here
  const files = new Files(app, `/${config.apiVersion}/files`);
  try {
    await files.initialize();
  } catch (ex) {
    logger.error('"Files" middleware initialization error', ex);
  }

  const jobs = new Jobs(app, `/${config.apiVersion}/jobs`);
  try {
    await jobs.initialize();
  } catch (ex) {
    logger.error('"Jobs" middleware initialization error', ex);
  }

  const bots = new Bots(app, `/${config.apiVersion}/bots`);
  try {
    await bots.initialize();
  } catch (ex) {
    logger.error('"Bots" middleware initialization error', ex);
  }

  async function updateHostname(newHostname) {
    const updateScriptPath = path.join(process.env.PWD, 'rename.sh');
    const updateHostnameString = `/bin/bash ${updateScriptPath} ${newHostname}`;
    await execPromise(updateHostnameString)
    .catch((execError) => {
      logger.error('Update hostname error', execError);
    });
    return true;
  }

  router.get('/download-logs', async (ctx) => {
    try {
      await new Promise((resolve, reject) => {
        pack(path.join(process.env.PWD, 'logs'))
        .pipe(write(`${process.env.PWD}/mcu-logs.tar.gz`))
        .on('error', (zipError) => {
          logger.error(zipError);
          reject();
        })
        .on('close', () => {
          resolve();
        });
      });

      ctx.res.setHeader('Content-disposition', 'attachment; filename=mcu-logs.tar.gz');
      ctx.body = fs.createReadStream(process.env.PWD + '/mcu-logs.tar.gz');
    } catch (ex) {
      ctx.status = 500;
      ctx.body = `Download logs failure: ${ex}`;
      logger.error(ex);
    }
  });

  router.post('/hostname', async (ctx) => {
    if (process.env.PWD !== '/home/pi/machine-collaboration-utility/') {
      return;
    }

    const hostname = await getHostname();
    if (!hostname) {
      return ctx.redirect('/');
    }

    if (!ctx.request.body || !ctx.request.body.hostname || ctx.request.body.hostname === hostname) {
      return ctx.redirect('/');
    }

    await updateHostname(ctx.request.body.hostname);
    ctx.redirect('/');
  });

  router.post('/reset', (ctx) => {
    process.exit(1);
    ctx.body = 'Resetting';
  });

  // Latch the defined routes to the koa app
  app.use(router.routes(), router.allowedMethods());

  app.on('error', (error, ctx) => {
    logger.error('server error', error, ctx);
  });

  app.io.on('command', (socket, args) => {
    const botUuid = args.botUuid;
    const command = args.command;
    if (botUuid && command) {
      try {
        app.context.bots.botList[botUuid].processCommand(command, args);
      } catch (ex) {
        console.log('Command error', ex);
      }
    }
  });

  logger.info('Machine Collaboration Utility has been initialized successfully.');

  return app;
}

module.exports = koaApp;
