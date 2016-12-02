require('source-map-support').install();
try {
  require('dotenv').config();
} catch(ex) {
  console.log('No .env file found', ex);
}

const winston = require('winston');
const path = require('path');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');
const http = require('http');

const config = require('./config');
const koaApp = require('./koaApp');

function dumpError(err) {
  if (typeof err === 'object') {
    if (err.message) {
      console.log('\nMessage: ' + err.message)
    }
    if (err.stack) {
      console.log('\nStacktrace:')
      console.log('====================')
      console.log(err.stack);
    }
  } else {
    console.log('dumpError :: argument is not an object');
  }
}

// Set up logging
const filename = path.join(__dirname, '../catchall.log');
const logger = new (winston.Logger)({
  level: 'debug',
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename }),
  ],
});
logger.info('started logging');

process.on('uncaughtException', (err) => {
  logger.error(`Caught exception: ${err}`);
  dumpError(err);
});


// Set up the app
try {
  bsync(() => {
    // Create a new app object and set it up
    const app = bwait(koaApp(config));
    const server = http.createServer(app.callback());

    /**
     * Listen on provided port, on all network interfaces.
     * Port is set per command line, or the config, and falls back on port 9000
     */


    const port = normalizePort(process.env.PORT || '9000');

    app.server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);
    app.context.logger.info('Server initialized');
  })();
} catch (ex) {
  app.context.logger.error('Catchall Server Error Handler', ex);
}

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

/**
 * Event listener for HTTP server "error" event.
 */
function onError(error, inPort) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof inPort === 'string'
  ? 'Pipe ' + inPort
  : 'Port ' + inPort;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debugInstance('Listening on ' + bind);
}
