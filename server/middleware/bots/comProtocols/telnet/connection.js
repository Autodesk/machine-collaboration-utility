/*******************************************************************************
 * connection.js
 *
 * A class to manage opening, maintaining, and closing a telnet connection.
 ******************************************************************************/
const _ = require(`underscore`);
const net = require(`net`);

/**
 * TelnetConnection()
 *
 * Manages a telnet connection.
 *
 *
 * User defined callbacks can be set for processing data, close, and error
 *
 * Args:   externalEndpoint - external url that we are communicating with
 *         inInitDataFunc  - passed opening sequence data (inInitDataFunc(inData))
 *         inConnectedFunc - function to call when we have successfully
 *                           connected
 * Return: N/A
 */
class TelnetConnection {
  constructor(app, externalEndpoint, doneFunction) {
    this.app = app;
    this.logger = app.context.logger;

    this.externalEndpoint = externalEndpoint;
    this.doneFunction = doneFunction;

    // User configurable data callback and close notification.  Our initial
    // data function handles the open sequence.
    this.mDataFunc = undefined;
    this.mCloseFunc = undefined;
    this.mErrorFunc = undefined;
    this.mPort = net.createConnection({
      port: 23,
      host: this.externalEndpoint,
    }, () => {
      doneFunction(this);
    });

    this.mPort.on('data', (data) => {
      if (_.isFunction(this.mDataFunc)) {
        this.mDataFunc(data);
      }
    });
  }

  /*******************************************************************************
   * Public interface
   *******************************************************************************/
  /**
   * setDataFunc(), setCloseFunc, setErrorFunc()
   *
   * Set the user configurable functions to call when we receive data,
   * close the port or have an error on the port.
   */
  setDataFunc(inDataFunc) {
    this.mDataFunc = inDataFunc;
  }

  setCloseFunc(inCloseFunc) {
    this.mCloseFunc = inCloseFunc;
  }

  setErrorFunc(inErrorFunc) {
    this.mErrorFunc = inErrorFunc;
  }

  /**
   * send()
   *
   * Send a command to the device
   *
   * Args:   inCommandStr - string to send
   * Return: N/A
   */
  send(inCommandStr) {
    try {
      this.mPort.write(inCommandStr);
      this.mDataFunc('ok');
      // commandSent = true;
    } catch (ex) {
      // ERROR
    }
  }

  /**
   * close()
   *
   * Close our connection
   *
   * Args:   N/A
   * Return: N/A
   */
  close() {
    this.mPort.destroy();
    this.logger.info(`Closing telnet connection!`);
  }
}

module.exports = TelnetConnection;
