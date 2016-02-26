/*******************************************************************************
 * serialConnection.js
 *
 * A class to manage opening, maintaining, and closing a serial connection.
 * This class wraps a serialport connection and mostly cleanly handles the data
 * stream following open so that we settle into a clean state to match commands
 * with responses.
 ******************************************************************************/
var _ = require('underscore'),
    Heartbeat = require('heartbeater');
let logger;

// loading serialport may fail, so surround it with a try
var SerialPort = require('serialport');     // NEEDS LIBUSB Binaries to work
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
var SerialConnection = function(inComName, inBaud, inOpenPrimeStr,
                                inInitDataFunc, inConnectedFunc, inLogger) {
    // logger = inLogger;
    var that = this;
    var portParams = { baudrate : inBaud,
                       parser: SerialPort.parsers.readline('\n') };

    this.mPort = new SerialPort.SerialPort(inComName, portParams, false);
    this.mConnectedFunc = inConnectedFunc;

    // User configurable data callback and close notification.  Our initial
    // data function handles the open sequence.
    this.mDataFunc = _.bind(this.receiveOpenResponse, this);
    this.mOpenPrimeStr = inOpenPrimeStr;
    this.mInitDataFunc = inInitDataFunc;
    this.mCloseFunc = undefined;
    this.mErrorFunc = undefined;

    this.mState = SerialConnection.State.OPENED;
    this.mWait = SerialConnection.WAIT_COUNT;
    this.mRetries = SerialConnection.MAX_RETRIES;

    this.mHeartbeat = new Heartbeat();
    this.mHeartbeat.interval(SerialConnection.HEART_BEAT_INTERVAL);
    this.mHeartbeat.add(_.bind(this.heartbeat, this));
    this.mHeartbeat.start();

    // Open our port and register our stub handers
    this.mPort.open(function(error) {
        // logger.info('Serial port opened');
        if (error) {
            // logger.warn('Failed to open com port:', inComName, error);
        } else {
            that.mPort.on('data', function (inData) {
              console.log('Data received:', inData.toString());
                    if (_.isFunction(that.mDataFunc)) {
                        that.mDataFunc(inData);
                    }
                });

            that.mPort.on('close', function () {
                    if (_.isFunction(that.mCloseFunc)) {
                        that.mCloseFunc();
                    }
                });

            that.mPort.on('error', function () {
                    if (_.isFunction(that.mErrorFunc)) {
                        that.mErrorFunc(arguments);
                    }
                });

            // Some printers start spewing data on open, some require a prime
            if (that.mOpenPrimeStr && (that.mOpenPrimeStr !== '')) {
                that.mPort.write(that.mOpenPrimeStr + '\n');
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
    var error = undefined;
    var commandSent = false;

    if (this.mState === SerialConnection.State.CONNECTED) {
        try {
            console.log('Serial:', inCommandStr);
            this.mPort.write(inCommandStr);
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
SerialConnection.HEART_BEAT_INTERVAL = 200;
SerialConnection.WAIT_COUNT = 20;
SerialConnection.MAX_RETRIES = 4;
SerialConnection.State = {
    OPENED        : 'opened',
    DATA_EXPECTED : 'data is expected',
    DATA_RECEIVED : 'data was received',
    M115_SENT     : 'M115 sent',
    M115_RECEIVED : 'M115 received',
    CONNECTED     : 'connected'
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
        // logger.info('Wrote M115 to serialport');
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
    this.mPort.close(function(err) {
        // logger.info('Serial port closed');
        if (err) {
            // logger.error('Failed closing the port', err);
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

    case SerialConnection.State.M115_SENT:
        if (dataStr === 'ok') {
            this.mState = SerialConnection.State.M115_RECEIVED;
        }
        break;
    }
};


module.exports = SerialConnection;
