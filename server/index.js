/* global logger */
require('source-map-support').install();

try {
  require('dotenv').config();
} catch (ex) {
  console.log('No .env file found', ex);
}

global.Promise = require('bluebird');
const path = require('path');
const http = require('http');
const fs = require('fs-promise');
const winston = require('winston');
require('winston-daily-rotate-file');

// Make sure PWD is set to the root folder of this project
if (process.env.PWD === undefined) {
  process.env.PWD = path.join(__dirname, '../');
}

const config = require('./config');
const koaApp = require('./koaApp');

/**
 * Normalize a port into a number, string, or false.
 */
function normalizePort(val) {
  const normalizedPort = parseInt(val, 10);
  if (isNaN(normalizedPort)) {
    return val;
  }

  if (normalizedPort >= 0) {
    return normalizedPort;
  }

  return false;
}

const loggerTransport = new winston.transports.DailyRotateFile({
  filename: 'mcu.log',
  datePattern: './logs/yyyy-MM-dd-',
  prepend: true,
  level: process.env.LOG_LEVEL || 'info',
  maxFiles: 7,
});

global.logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    loggerTransport,
  ],
});

logger.info('Logger initialized');

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err}`);
});

process.on('unhandledExecption', (err) => {
  logger.error(`Unhandled exception: ${err}`);
});

async function clearOldLogs() {
  const files = await fs.readdir('./logs');
  const logFiles = files.filter(file => file.includes('-mcu.log'));
  // Make sure that the files are sorted by date
  // With the newest files first
  // Still a chance that we could end up with up to 14 total log files
  logFiles.sort();
  logFiles.reverse();
  logFiles.forEach((logFile, i) => {
    if (i >= 7) {
      const filePath = path.join(process.env.PWD, `logs/${logFile}`);
      fs.unlink(filePath);
    }
  });
}

async function setupApp() {
  try {
    await clearOldLogs();
    // Create a new app object and set it up
    const app = await koaApp(config);
    http.createServer(app.callback());
    const port = normalizePort(process.env.PORT || '9000');
    app.server.listen(port);

    logger.info('Server initialized');
  } catch (ex) {
    logger.error('Catchall Server Error Handler', ex);
  }
}

setupApp();
