/*******************************************************************************
 * serialConnection.js
 *
 * A class to manage opening, maintaining, and closing a serial connection.
 * This class wraps a serialport connection and mostly cleanly handles the data
 * stream following open so that we settle into a clean state to match commands
 * with responses.
 ******************************************************************************/
const _ = require('underscore');
const Heartbeat = require('heartbeater');
const SerialPort = process.env.NODE_ENV !== 'test' ? require('serialport') : undefined;

const winston = require('winston');
const path = require('path');

/**
 * SerialConnection()
 *
 * Manages a serial connection.
 *
 * Opening the serial port will flood us with a number of data packets
 * with no discernable unique end.
 * This object tracks the state of the response, and within it a heartbeat
 * to detect when we haven't received data in some time.
 * At that point, we issue a M114 and parse its response at which point we
 * know we have a good connection.
 *
 * User defined callbacks can be set for processing data, close and error
 *
 * Args:   inComName       - name of our com port
 *         inBaud          - baud rate
 *         inOpenPrimeStr  - string of commands to prime the connection
 *         inInitDataFunc  - passed opening sequence data (inInitDataFunc(inData))
 *         inConnectedFunc - function to call when we have successfully
 *                           connected
 * Return: N/A
 */

let serialLogger;

if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
  // Set up logging for written serial data
  const serialLogName = path.join(__dirname, '../../../../../verbose-serial.log');
  serialLogger = new (winston.Logger)({
    levels: { write: 0, read: 1, info: 2 },
    transports: [
      new (winston.transports.Console)(),
      new (winston.transports.File)({ filename: serialLogName }),
    ],
  });
  serialLogger.info('started logging');
}

const roundAxis = function roundAxis(command, axis, self) {
  let roundedCommand = command;
  try {
    if (roundedCommand.indexOf(axis) !== -1) {
      const axisArray = roundedCommand.split(axis);
      const before = axisArray[0];
      const splitArray = axisArray[1].split(' ');
      const middle = axis + Number(splitArray[0]).toFixed(4);
      let end = '';
      if (splitArray.length > 1) {
        for (let i = 1; i < splitArray.length; i++) {
          end += ` ${splitArray[i]}`;
        }
      }
      roundedCommand = before + middle + end;
    }
  } catch (ex) {
    self.logger.error('Round Axis error', command, axis, ex);
  }
  return roundedCommand;
};

const roundGcode = function roundGcode(inGcode, self) {
  let gcode = inGcode;
  try {
    if (inGcode.indexOf('G1') !== -1) {
      gcode = roundAxis(gcode, 'X', self);
      gcode = roundAxis(gcode, 'Y', self);
      gcode = roundAxis(gcode, 'Z', self);
      gcode = roundAxis(gcode, 'E', self);
      gcode = roundAxis(gcode, 'F', self);
    }
  } catch (ex) {
    self.logger.error('Error index of G1', inGcode, ex);
  }
  return gcode;
};

const SerialConnection = function(
  app,
  inComName,
  inBaud,
  inOpenPrimeStr,
  inInitDataFunc,
  inConnectedFunc,
  inBot
) {
  this.app = app;
  this.io = app.io;
  this.logger = app.context.logger;
  const that = this;
  var portParams = {
    baudrate: inBaud,
    parser: SerialPort.parsers.readline('\n'),
    autoOpen: false,
  };

  this.mPort = new SerialPort(inComName, portParams);
  this.mConnectedFunc = inConnectedFunc;

  // User configurable data callback and close notification.  Our initial
  // data function handles the open sequence.
  this.mDataFunc = _.bind(this.receiveOpenResponse, this);
  this.mOpenPrimeStr = inOpenPrimeStr;
  this.mInitDataFunc = inInitDataFunc;
  this.bot = inBot;

  this.mCloseFunc = undefined;
  this.mErrorFunc = undefined;

  this.mState = SerialConnection.State.OPENED;
  this.mWait = SerialConnection.WAIT_COUNT;
  this.mRetries = SerialConnection.MAX_RETRIES;

  this.mHeartbeat = new Heartbeat();
  this.mHeartbeat.interval(SerialConnection.HEART_BEAT_INTERVAL);
  this.mHeartbeat.add(_.bind(this.heartbeat, this));
  this.mHeartbeat.start();
  this.returnString = '';

  this.m114Sent = false;
  this.currentPosition = {
    x: undefined,
    y: undefined,
    z: undefined,
    e: undefined,
  };

  // Open our port and register our stub handers
  this.mPort.open(function(error) {
    that.logger.info('Serial port opened');
    if (error) {
      that.logger.warn('Failed to open com port:', inComName, error);
    } else {
      that.mPort.on('data', function (inData) {
        if (that.m114Sent) {
          that.m114Sent = false;
          that.parseM114(inData);
        }
        const data = inData.toString();
        if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
          serialLogger.log('read', data);
        }
        this.returnString += data;
        if (data.includes('ok')) {
          if (_.isFunction(that.mDataFunc)) {
            that.mDataFunc(String(this.returnString));
            this.returnString = '';
          }
          that.io.broadcast('botReply', data);
        }
      });
      that.mPort.on('close', function () {
        if (_.isFunction(that.mCloseFunc)) {
          that.mCloseFunc();
        }
      });

      that.mPort.on('error', function (error) {
        that.logger.error('Serial error', error);
        if (_.isFunction(that.mErrorFunc)) {
          that.mErrorFunc(arguments);
        }
      });

      // Some printers start spewing data on open, some require a prime
      if (that.mOpenPrimeStr && (that.mOpenPrimeStr !== '')) {
        that.mPort.write(that.mOpenPrimeStr + '\n');
        if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
          serialLogger.log('write', that.mOpenPrimeStr + '\n');
        }
      }
    }
  });
};


/*******************************************************************************
 * Public interface
 *******************************************************************************/

/**
 * setDataFunc(), setCloseFunc, setErrorFunc()
 *
 * Set the user configurable functions to call when we receive data,
 * close the port or have an error on the port.
 */
SerialConnection.prototype.setDataFunc = function (inDataFunc) {
  if (this.mState === SerialConnection.State.CONNECTED) {
    this.mDataFunc = inDataFunc;
  } else {
    // logger.error('Cannot set a custom data function until we have connected');
  }
};

SerialConnection.prototype.setCloseFunc = function (inCloseFunc) {
  this.mCloseFunc = inCloseFunc;
};

SerialConnection.prototype.setErrorFunc = function (inErrorFunc) {
  this.mErrorFunc = inErrorFunc;
};

/**
 * send()
 *
 * Send a command to the device
 *
 * Args:   inCommandStr - string to send
 * Return: N/A
 */
SerialConnection.prototype.send = function (inCommandStr) {
  let gcode = roundGcode(inCommandStr);
  var error = undefined;
  var commandSent = false;

  if (this.mState === SerialConnection.State.CONNECTED) {
    try {
      // TODO add GCODE Validation regex
      // Add a line break if it isn't in there yet
      if (gcode.indexOf('\n') === -1) {
        gcode += '\n';
      }
      // update the current known position
      this.updateCurrentPosition(gcode);
      gcode = this.offsetGcode(gcode);
      console.log('about to write gcode', gcode);
      this.mPort.write(gcode);
      if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
        serialLogger.log('write', gcode);
      }
      commandSent = true;
    } catch (inError) {
      error = inError;
    }
  }

  if (!commandSent) {
    // logger.error('Cannot send commands if not connected:', this.mState, error);
  }
};

/**
 * close()
 *
 * Close our connection
 *
 * Args:   N/A
 * Return: N/A
 */
SerialConnection.prototype.close = function () {
  this.mPort.close(function(err) {
    // logger.info('Serialport is now closed');
    if (err) {
      // logger.error('Failed closing the port', err);
    }
  });
};


/*******************************************************************************
 * Internal implementation
 *******************************************************************************/

// constants
SerialConnection.HEART_BEAT_INTERVAL = 2000;
SerialConnection.WAIT_COUNT = 20;
SerialConnection.MAX_RETRIES = 4;
SerialConnection.State = {
  OPENED        : 'opened',
  DATA_EXPECTED : 'data is expected',
  DATA_RECEIVED : 'data was received',
  M114_SENT     : 'M114 sent',
  M114_RECEIVED : 'M114 received',
  CONNECTED     : 'connected',
};


/**
 * Periodic check to see if we have stopped receiving data from the initial
 * 'open()'.  If we have received a response wait more, if a response was
 * expected then we know we can proceed to the M114.
 * In the event this fires while we are expecting start or the M114 response
 * we can't consider this a functioning response and should not clean up.
 */
SerialConnection.prototype.heartbeat = function () {
  switch (this.mState) {
    case SerialConnection.State.DATA_RECEIVED:
      // This is the common case after opening, we've received data and
      // may expect more.
      this.mState = SerialConnection.State.DATA_EXPECTED;
      this.mWait = SerialConnection.WAIT_COUNT; // refresh our wait count
      return; // keep our heartbeat going

    case SerialConnection.State.DATA_EXPECTED:
      // We were expecting data from the open, but it finally stopped.
      // Issue the M114
      this.mPort.write('M114\n'); // can't use 'send()' until connected
      this.m114Sent = true;

      if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
        serialLogger.log('write', 'M114\n');
      }
      // logger.info('Wrote M114 to serialport');
      this.mState = SerialConnection.State.M114_SENT;
      this.mWait = SerialConnection.WAIT_COUNT; // refresh our wait count
      return;

    case SerialConnection.State.M114_RECEIVED:
      // OK, we have a clean handshake, our connection has been initialized
      this.mHeartbeat.clear();
      this.mState = SerialConnection.State.CONNECTED;
      this.mDataFunc = undefined;
      this.mConnectedFunc(this);
      return;

    case SerialConnection.State.OPENED:
    case SerialConnection.State.M114_SENT:
      // We expect responses when in these states.  Not receiving them
      // promptly indicates a problem, and we should not emit our 'deviceUp'.
      if (--this.mWait > 0) {
        return; // wait a bit longer
      }

      // Sometimes the printer is in an odd state, so we want to retry the M114
      // a few times before we give up
      if (--this.mRetries > 0) {
        this.mState = SerialConnection.State.DATA_EXPECTED;
        return; // retry the M114 again
      }

      // logger.warn('Failed to receive responses opening or after M114, ignoring port:', this.mPort.fd);
      break; // no love.  Fall through to cleanup and give up on this port

    default:
      // logger.error('This indicates a broken serialDiscovery SerialConnection state engine');
      break;
  }

  // Cleanup the heartbeat and close our port
  this.mHeartbeat.clear();
  this.mPort.close(function(err) {
    // logger.info('Serial port closed');
    if (err) {
      // logger.error('Failed closing the port', err);
    }
  });
};

/**
 * parseM114
 *
 * Special case of figuring out marlin initial position when the port is opened
 *
 */
SerialConnection.prototype.parseM114 = function (reply) {
  const newPosition = {
    x: undefined,
    y: undefined,
    z: undefined,
    e: undefined,
  };
  try {
    newPosition.x = Number(Number(reply.split('X:')[1].split('Y')[0]) - Number(this.bot.settings.offsetX)).toFixed(3);
    newPosition.y = Number(Number(reply.split('Y:')[1].split('Z')[0]) - Number(this.bot.settings.offsetY)).toFixed(3);
    newPosition.z = Number(Number(reply.split('Z:')[1].split('E')[0]) - Number(this.bot.settings.offsetZ)).toFixed(3);
    newPosition.e = reply.split('E:')[1].split(' ')[0];
    this.currentPosition = newPosition;
  } catch (ex) {
    self.logger.error('Failed to set position', reply, ex);
  }
};

SerialConnection.prototype.updateCurrentPosition = function (gcode) {
  const commandArgs = gcode.split(' ');
  switch (commandArgs[0]) {
    case 'G1':
      console.log('about to process args', commandArgs);
      commandArgs.forEach((arg) => {
        if (arg.indexOf('X') !== -1) {
          this.currentPosition.x = Number(arg.split('X')[1], 10);
        }
        if (arg.indexOf('Y') !== -1) {
          this.currentPosition.y = Number(arg.split('Y')[1], 10);
        }
        if (arg.indexOf('Z') !== -1) {
          this.currentPosition.z = Number(arg.split('Z')[1], 10);
        }
        if (arg.indexOf('E') !== -1) {
          this.currentPosition.e = Number(arg.split('E')[1], 10);
        }
      });
      break;
    default:
      break;
  }
};

SerialConnection.prototype.offsetGcode = function (gcode) {
  return gcode;
};

/**
 * receiveOpenResponse()
 *
 * Special case handler to parse off data received after opening, until we
 * achieve a steady state.
 */
SerialConnection.prototype.receiveOpenResponse = function (inData) {
  var dataStr = inData.toString('utf8');
  // Allow our creator to parse this data
  if (_.isFunction(this.mInitDataFunc)) {
    this.mInitDataFunc(dataStr);
  }

  // Now depending manage our state based on our existing state and data received
  switch (this.mState) {
    case SerialConnection.State.OPENED:
      // Good to know we are receiving data, but more is expected
      this.mState = SerialConnection.State.DATA_EXPECTED;
      break;

    case SerialConnection.State.DATA_EXPECTED:
      // A common case, data was expected and has now been received
      this.mState = SerialConnection.State.DATA_RECEIVED;
      break;

    case SerialConnection.State.M114_SENT:
      if (dataStr.indexOf('ok') !== -1) {
        this.mState = SerialConnection.State.M114_RECEIVED;
      }
      break;
    default:
      break;
  }
};


module.exports = SerialConnection;
