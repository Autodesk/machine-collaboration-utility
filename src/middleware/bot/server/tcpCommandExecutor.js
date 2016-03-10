/*******************************************************************************
 * TCPCommandExecutor()
 *
 * Constructor for the TCPCommandExecutor.  The command queue requests to
 * open and close the connection, and while open sends command strings to be
 * executed.
 *
 * This class uses SerialConnection() to establish and maintain our connection
 * open.
 *
 * Args:   externalEndpoint - url at which to communicate
 */

var TCPConnection = require('./tcpConnection');

var TCPCommandExecutor = function (externalEndpoint) {
  this.externalEndpoint = externalEndpoint;
  this.mConnection = undefined;
  this.mCommandsProcessed = undefined;
};

/**
 * getCommandsProcessed()
 *
 * Accessor
 */
TCPCommandExecutor.prototype.getCommandsProcessed = function () {
  return this.mCommandsProcessed;
};

/**
 * open()
 *
 * The executor's open uses a SerialConnection object to establish a
 * stable connection.
 *
 * Args:   inDoneFunc - called when we complete our connection
 * Return: N/A
 */
TCPCommandExecutor.prototype.open = function (inDoneFunc) {
  this.mConnection = new TCPConnection(
    this.externalEndpoint,
    () => { inDoneFunc(true); }
  );
  this.mCommandsProcessed = 0;
};

/**
 * close()
 *
 * The executor simply closes any open port.
 *
 * Args:   inDoneFunc - called when we close our connection
 * Return: N/A
 */
TCPCommandExecutor.prototype.close = function (inDoneFunc) {
  var that = this;
  // that.mConnection.close();
  inDoneFunc(true);
  that.mCommandsProcessed = undefined;
};


/**
 * execute()
 *
 * Send the requested command to the device, passing any response
 * data back for processing.
 *
 * Args:   inRawCode  - command to send
 *         inDataFunc - function to call with response data
 *         inDoneFunc - function to call if the command will have no response
 */
TCPCommandExecutor.prototype.execute = function (
  inRawCode,
  inDataFunc,
  inDoneFunc
) {
  this.mConnection.setDataFunc(inDataFunc);
  this.mConnection.send(inRawCode);
  this.mCommandsProcessed++;
};

module.exports = TCPCommandExecutor;
