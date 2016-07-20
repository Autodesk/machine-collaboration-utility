/*******************************************************************************
 * connection.js
 *
 * A class to manage opening, maintaining, and closing an http connection.
 ******************************************************************************/
var _ = require('underscore'),
    Heartbeat = require('heartbeater');
let logger;

var request = require(`request-promise`);
var request2 = require(`request`);
/**
 * HttpConnection()
 *
 * Manages an http connection.
 *
 *
 * User defined callbacks can be set for processing data, close and error
 *
 * Args:   externalEndpoint - external url that we are communicating with
 *         inInitDataFunc  - passed opening sequence data (inInitDataFunc(inData))
 *         inConnectedFunc - function to call when we have successfully
 *                           connected
 * Return: N/A
 */
class HttpConnection {
  constructor(app, externalEndpoint, doneFunction) {
    this.app = app;
    this.logger = app.context.logger;
    this.io = app.io;
    this.externalEndpoint = externalEndpoint;
    this.doneFunction = doneFunction;

    // User configurable data callback and close notification.  Our initial
    // data function handles the open sequence.
    this.mDataFunc = undefined;
    this.mCloseFunc = undefined;
    this.mErrorFunc = undefined;

    // A hack. Normally we would validate the connection and then call this function
    // once we are validated
    const getRequestParams = {
      method: `GET`,
      uri: this.externalEndpoint,
      json: true,
    };
    try {
      request(getRequestParams)
      .then((reply) => {
        if (reply.data.state === `connected`) {
          doneFunction(this);
        } else {
          const connectRequestParams = {
            method: `POST`,
            uri: this.externalEndpoint,
            body: {
              command: `connect`,
            },
            json: true,
          };
          try {
            request(connectRequestParams)
            .then(() => {
              doneFunction(this);
            })
            .catch((err) => {
              this.logger.info(err.error);
            });
          } catch (ex) {
            this.logger.error('Http connection error', ex);
          }
        }
      })
      .catch((err) => {
        this.logger.info(err.error);
      });
    } catch (ex) {
      this.logger.error('Http connection error', ex);
    }
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
    let command;
    switch (inCommandStr) {
      case `M104 S0\n`:
      case `M140 S0\n`:
        command = `G4 P0\n`;
        break;
      case `M109 S0 T0\n`:
      case `M109 S0\n`:
        command = `M104 S0\n`;
        break;
      default:
        command = inCommandStr;
    }

    let stream = false;
    switch (true) {
      case inCommandStr.includes(`G0`):
      case inCommandStr.includes(`G1`):
      case inCommandStr.includes(`G4`):
        stream = true;
        break;
      default:
        break;
    }

    if (inCommandStr !== command) {
      this.logger.info(`Changed "${inCommandStr}" to "${command}"`);
    }

    var error = undefined;
    var commandSent = false;

    try {
      const requestParams = {
        method: `POST`,
        uri: `${this.externalEndpoint}`,
        body: {
          command: stream ? `streamGcode` : `processGcode`,
          gcode: command,
        },
        json: true,
      };
      try {
        const reply = await request(requestParams);
        if (String(reply.data) === `false`) {
          setTimeout(() => {
            this.send(inCommandStr);
          }, 1000);
        }
        if (_.isFunction(this.mDataFunc)) {
          this.mDataFunc(reply.data);
        }
        commandSent = true;
      } catch (ex) {
        this.logger.info(ex);
        setTimeout(() => {
          this.send(inCommandStr);
        }, 1000);
      }
    } catch (ex) {
      this.logger.error('Send command fail', ex);
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
  async close() {
    const getRequestParams = {
      method: `GET`,
      uri: this.externalEndpoint,
      json: true,
    };
    try {
      const reply = request(getRequestParams)

      // use this line to handle states where disconnect should be idempodent
      if (false) {

      } else {
        const disconnectRequestParams = {
          method: `POST`,
          uri: this.externalEndpoint,
          body: {
            command: `disconnect`,
          },
          json: true,
        };
        try {
          await request(disconnectRequestParams);
        } catch (ex) {
          this.logger.error('Http connection error', ex);
        }
      }
    } catch (ex) {
      this.logger.error('Http connection error', ex);
    }
  }
}

module.exports = HttpConnection;
