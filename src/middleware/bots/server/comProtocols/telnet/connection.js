/*******************************************************************************
 * connection.js
 *
 * A class to manage opening, maintaining, and closing a telnet connection.
 ******************************************************************************/
const Telnet = require(`telnet-client`);
const _ = require(`underscore`);

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
  constructor(externalEndpoint, doneFunction) {
    this.externalEndpoint = externalEndpoint;
    this.doneFunction = doneFunction;

    // User configurable data callback and close notification.  Our initial
    // data function handles the open sequence.
    this.mDataFunc = undefined;
    this.mCloseFunc = undefined;
    this.mErrorFunc = undefined;
    this.mPort = new Telnet();

    this.mPort.on(`writedone`, () => {
      // done writing a command
    });

    this.mPort.on(`ready`, () => {
      doneFunction(this);
    });

    const connectionParams = {
      host: this.externalEndpoint,
      port: 23,
      shellPrompt: ``,
      timeout: 1500,
    };

    this.mPort.connect(connectionParams);
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
  async send(inCommandStr) {
    try {
      this.mPort.exec((inCommandStr), (error, reply) => {
        if (_.isFunction(this.mDataFunc)) {
          this.mDataFunc(reply);
        }
      });
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
    this.mPort.end();
    console.log(`Closing telnet connection!`);
  }
}

module.exports = TelnetConnection;
