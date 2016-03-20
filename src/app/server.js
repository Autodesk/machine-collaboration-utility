require(`source-map-support`).install();
require('dotenv').config();
require(`babel-polyfill`);
const http = require(`http`);

const config = require(`./config`);
const KoaApp = require(`./koaApp`);

// Pass a flag to the app to be a conductor or a bot
const conducting = process.env.NODE_ENV === `conducting` ? true : false;

// Create a new app object and set it up
const koaApp = new KoaApp(config, conducting);
koaApp.initialize();

const app = koaApp.app; // Messy, but the app is actually in the koaApp object
const server = http.createServer(app.callback());

/**
 * Listen on provided port, on all network interfaces.
 * Port is set per command line, or the config, and falls back on port 9000
 */
const port = normalizePort(process.env.PORT || config.port || `9000`);

try {
  app.server.listen(port);
  server.on(`error`, onError);
  server.on(`listening`, onListening);
  app.context.logger.info(`Server initialized`);
} catch (ex) {
  app.context.logger.error(`Catchall Server Error Handler`, ex);
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
