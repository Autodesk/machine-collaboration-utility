/*******************************************************************************
 * TelnetCommandExecutor()
 *
 * Constructor for the TelnetCommandExecutor.  The command queue requests to
 * open and close the connection, and while open sends command strings to be
 * executed.
 *
 * This class uses Telnet's connection.js library to establish and maintain our connection
 *
 * Args:   externalEndpoint - url at which to communicate
 */

const TelnetConnection = require(`./connection`);

const TelnetCommandExecutor = function (externalEndpoint) {
  this.externalEndpoint = externalEndpoint;
  this.mConnection = undefined;
  this.mCommandsProcessed = undefined;
};

/**
 * getCommandsProcessed()
 *
 * Accessor
 */
TelnetCommandExecutor.prototype.getCommandsProcessed = function () {
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
TelnetCommandExecutor.prototype.open = function (inDoneFunc) {
  this.mConnection = new TelnetConnection(
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
TelnetCommandExecutor.prototype.close = function (inDoneFunc) {
  this.mConnection.close();
  inDoneFunc(true);
  this.mCommandsProcessed = undefined;
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
TelnetCommandExecutor.prototype.execute = function (
  inRawCode,
  inDataFunc,
  inDoneFunc
) {
  this.mConnection.setDataFunc(inDataFunc);
  this.mConnection.send(inRawCode);
  this.mCommandsProcessed++;
};

module.exports = TelnetCommandExecutor;
