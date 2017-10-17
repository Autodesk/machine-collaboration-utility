/* global logger */
/** *****************************************************************************
 * serialConnection.js
 *
 * A class to manage opening, maintaining, and closing a serial connection.
 * This class wraps a serialport connection and mostly cleanly handles the data
 * stream following open so that we settle into a clean state to match commands
 * with responses.
 ***************************************************************************** */
const Heartbeat = require('heartbeater');

let SerialPort;
if (process.env.NODE_ENV !== 'test') {
  SerialPort = require('serialport'); // NEEDS LIBUSB Binaries to work
}

/**
 * SerialConnection()
 *
 * Manages a serial connection.
 *
 * Opening the serial port will flood us with a number of data packets
 * with no discernable unique end.
 * This object tracks the state of the response, and within it a heartbeat
 * to detect when we haven't received data in some time.
 * At that point, we issue a M115 and parse its response at which point we
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

const roundAxis = function roundAxis(command, axis, self) {
  let roundedCommand = command;
  try {
    if (roundedCommand.indexOf(axis) !== -1) {
      const axisArray = roundedCommand.split(axis);
      const before = axisArray[0];
      const splitArray = axisArray[1].split(' ');
      const middle =
        axis === 'F' ? axis + parseInt(splitArray[0], 10) : axis + Number(splitArray[0]).toFixed(4);
      let end = '';
      if (splitArray.length > 1) {
        for (let i = 1; i < splitArray.length; i++) {
          end += ` ${splitArray[i]}`;
        }
      }
      roundedCommand = before + middle + end;
    }
  } catch (ex) {
    logger.error('Round Axis error', command, axis, ex);
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
    logger.error('Error index of G1', inGcode, ex);
  }
  return gcode;
};

var SerialConnection = function (connectionObject) {
  this.app = connectionObject.app;
  this.io = connectionObject.app.io;
  this.bot = connectionObject.bot;

  const that = this;
  const Regex = SerialPort.parsers.Regex;
  const portParams = {
    baudRate: connectionObject.baudrate,
    autoOpen: false,
  };

  this.mLineNumber = 0; // Used to track line number for checksum

  this.mPort = new SerialPort(connectionObject.comName, portParams);
  // Pipe received data to this variable for parsing
  this.mParser = this.mPort.pipe(new Regex({ regex: /\r?\n|\r/ }));
  this.mConnectedFunc = connectionObject.connectedFunc;

  // User configurable data callback and close notification.  Our initial
  // data function handles the open sequence.
  this.mDataFunc = this.receiveOpenResponse.bind(this);
  this.mOpenPrimeStr = connectionObject.openPrimeStr;
  this.mInitDataFunc = connectionObject.dataFunc;
  this.mCloseFunc = undefined;
  this.mErrorFunc = undefined;

  this.mState = SerialConnection.State.OPENED;
  this.mWait = SerialConnection.WAIT_COUNT;
  this.mRetries = SerialConnection.MAX_RETRIES;

  this.mHeartbeat = new Heartbeat();
  this.mHeartbeat.interval(SerialConnection.HEART_BEAT_INTERVAL);
  this.mHeartbeat.add(this.heartbeat.bind(this));
  this.mHeartbeat.start();
  this.returnString = '';

  // Variables used for repeating a command if no reply is received
  this.timeoutAmount = 10 * 60 * 1000; // aka wait 10 minutes before sending again
  this.timeout = undefined; // The timeout function we will use to send the command again

  // Open our port and register our stub handers
  this.mPort.open((error) => {
    logger.info('Serial port opened');
    if (error) {
      logger.warn('Failed to open com port:', inComName, error);
    } else {
      that.mParser.on('data', (inData) => {
        const data = inData.toString();
        logger.info('RX:', data);
        if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
          logger.debug('read', data);
        }
        const lineBreak = that.returnString.length > 0 ? '\n' : '';
        that.returnString += `${lineBreak}${data}`;
        // If we have an 'ok' or the firmware has registered a checksum error
        if (
          that.returnString.includes('ok') ||
          that.returnString.toLowerCase().substring(0, 2) === 'rs' // smoothieware doesn't reply with 'ok'
        ) {
          // If the firmware has said that there is an error
          if (
            that.bot.info.checksumSupport &&
            (that.returnString.toLowerCase().includes('resend') || // for marlin checksum
              that.returnString.toLowerCase().substring(0, 2) === 'rs') // for smoothieware checksum
          ) {
            that.mLineNumber -= 1;
          }

          // Handle serial resets
          if (that.timeout !== undefined) {
            clearTimeout(that.timeout);
            that.timeout = undefined;
          }
          if (typeof that.mDataFunc === 'function') {
            that.io.broadcast(`botRx${that.bot.settings.uuid}`, that.returnString);
            that.mDataFunc(String(that.returnString));
            that.returnString = '';
          }
        }
      });

      that.mPort.on('close', () => {
        if (typeof that.mCloseFunc === 'function') {
          that.mCloseFunc();
        }
      });

      that.mPort.on('error', (error) => {
        logger.error('Serial error', error);
        if (typeof that.mErrorFunc === 'function') {
          that.mErrorFunc(arguments);
        }
      });

      // Some printers start spewing data on open, some require a prime
      if (that.mOpenPrimeStr && that.mOpenPrimeStr !== '') {
        that.mPort.write(`${that.mOpenPrimeStr}\n`);
        if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
          logger.debug('write', `${that.mOpenPrimeStr}\n`);
        }
      }
    }
  });
};

/** *****************************************************************************
 * Public interface
 ****************************************************************************** */

/**
 * checksum
 *
 * Calculate the checksum for each line
 */
SerialConnection.prototype.checksum = function (inGcodeLine) {
  // Handle M110
  // Handle N<i> M110
  // Handle normal gcode
  // Add line number, if it's not already in the line to be send

  let gcodeLine = inGcodeLine;

  if (!gcodeLine.includes('M110')) {
    gcodeLine = `N${this.mLineNumber} ${gcodeLine}`;
    // Calculate the checksum
    let checksum = 0;
    gcodeLine.split('').forEach((char) => {
      checksum ^= char.charCodeAt(0);
    });
    // For testing: Make this fail 10% of the time
    // if (parseInt(Math.random() * 10, 10) === 0) {
    //   checksum += 1;
    // }
    // gcodeLine += `*${checksum}`;
  }
  return gcodeLine;
};

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
    logger.error('Cannot set a custom data function until we have connected');
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
  const that = this;
  let gcode = roundGcode(inCommandStr);
  let error;
  let commandSent = false;

  if (that.mState === SerialConnection.State.CONNECTED) {
    try {
      // Don't add checksum if it's already there
      if (that.bot.info.checksumSupport && !that.bot.checksumRunaway) {
        if (!gcode.includes('*')) {
          gcode = that.checksum(gcode.split('\n')[0]);
        }

        // Reset current line number
        if (gcode.includes('M110')) {
          if (gcode.split('N').length > 2) {
            that.mLineNumber = parseInt(gcode.split('N')[2].split('*')[0], 10);
          } else if (gcode.includes('N')) {
            that.mLineNumber = parseInt(gcode.split('N')[1].split('*')[0], 10);
          } else {
            that.mLineNumber = 0;
          }
          logger.info('Resetting line count to', that.mLineNumber);
        }
        that.mLineNumber += 1;
      }

      // TODO add GCODE Validation regex
      // Add a line break if it isn't in there yet
      if (gcode.indexOf('\n') === -1) {
        gcode += '\n';
      }
      logger.info('TX:', gcode);
      that.mPort.write(gcode);

      that.io.broadcast(`botTx${that.bot.settings.uuid}`, gcode);
      function sendAgain() {
        logger.error('ComError', gcode);
        that.mPort.write(gcode);
      }
      // Prepare to send the gcode line again in <t> milliseconds
      that.timeout = setTimeout(sendAgain, that.timeoutAmount);

      if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
        logger.debug('write', gcode);
      }
      commandSent = true;
    } catch (inError) {
      error = inError;
    }
  }

  if (!commandSent) {
    logger.error('Cannot send commands if not connected:', this.mState, error);
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
  logger.info('Serialport about to close');
  this.mPort.close((err) => {
    logger.info('Serialport is now closed');
    if (err) {
      logger.error('Failed closing the port', err);
    }
  });
};

/** *****************************************************************************
 * Internal implementation
 ****************************************************************************** */

// constants
SerialConnection.HEART_BEAT_INTERVAL = 2000;
SerialConnection.WAIT_COUNT = 5;
SerialConnection.MAX_RETRIES = 10;
SerialConnection.State = {
  OPENED: 'opened',
  DATA_EXPECTED: 'data is expected',
  DATA_RECEIVED: 'data was received',
  M115_SENT: 'M115 sent',
  M115_RECEIVED: 'M115 received',
  CONNECTED: 'connected',
};

/**
 * Periodic check to see if we have stopped receiving data from the initial
 * 'open()'.  If we have received a response wait more, if a response was
 * expected then we know we can proceed to the M115.
 * In the event this fires while we are expecting start or the M115 response
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
      // Issue the M115
      this.mPort.write('M115\n'); // can't use 'send()' until connected
      if (process.env.VERBOSE_SERIAL_LOGGING === 'true') {
        logger.debug('write', 'M115\n');
      }
      logger.debug('Wrote M115 to serialport');
      this.mState = SerialConnection.State.M115_SENT;
      this.mWait = SerialConnection.WAIT_COUNT; // refresh our wait count
      return;

    case SerialConnection.State.M115_RECEIVED:
      // OK, we have a clean handshake, our connection has been initialized
      this.mHeartbeat.clear();
      this.mState = SerialConnection.State.CONNECTED;
      this.mDataFunc = undefined;
      this.mConnectedFunc(this);
      return;

    case SerialConnection.State.OPENED:
    case SerialConnection.State.M115_SENT:
      // We expect responses when in these states.  Not receiving them
      // promptly indicates a problem, and we should not emit our 'deviceUp'.
      if (--this.mWait > 0) {
        return; // wait a bit longer
      }

      // Sometimes the printer is in an odd state, so we want to retry the M115
      // a few times before we give up
      if (--this.mRetries > 0) {
        this.mState = SerialConnection.State.DATA_EXPECTED;
        return; // retry the M115 again
      }

      // logger.warn('Failed to receive responses opening or after M115, ignoring port:', this.mPort.fd);
      break; // no love.  Fall through to cleanup and give up on this port

    default:
      // logger.error('This indicates a broken serialDiscovery SerialConnection state engine');
      break;
  }

  // Cleanup the heartbeat and close our port
  this.mHeartbeat.clear();
  this.mPort.close((err) => {
    logger.debug('Serial port closed');
    if (err) {
      logger.error('Failed closing the port', err);
    }
  });
};

/**
 * receiveOpenResponse()
 *
 * Special case handler to parse off data received after opening, until we
 * achieve a steady state.
 */
SerialConnection.prototype.receiveOpenResponse = function (inData) {
  const dataStr = inData.toString('utf8');
  // Allow our creator to parse this data
  if (typeof this.mInitDataFunc === 'function') {
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

    case SerialConnection.State.M115_SENT:
      if (dataStr.indexOf('ok') !== -1) {
        this.mState = SerialConnection.State.M115_RECEIVED;
      }
      break;
  }
};

module.exports = SerialConnection;
