/*******************************************************************************
 * FakeMarlinExecutor()
 *
 * This class mimics Marlin Firmware. All commands are accessed vai the executor
 * API calls as defined by CommandQueue
 *
 */
const VirtualConnection = require('./connection');

class VirtualExecutor {
  constructor(app) {
    this.connection = undefined;
    this.commandsProcessed = undefined;
    this.app = app;
  }

  /**
   * getCommandsProcessed()
   *
   * Accessor
   */
  getCommandsProcessed() {
    return this.commandsProcessed;
  }


  /**
   * open()
   *
   * The executor's open uses a SerialConnection object to establish a
   * stable connection.
   *
   * Args:   doneFunc - called when we complete our connection
   * Return: N/A
   */
  open(doneFunc) {
    this.connection = new VirtualConnection(
      this.app,
      () => { doneFunc(true); }
    );
    this.commandsProcessed = 0;
  }

  /**
   * close()
   *
   * The executor simply closes any open port.
   *
   * Args:   doneFunc - called when we close our connection
   * Return: N/A
   */
  close(doneFunc) {
    this.connection.close();
    doneFunc(true);
    this.commandsProcessed = undefined;
  }

  /**
   * execute()
   *
   * Send the requested command to the device, passing any response
   * data back for processing.
   *
   * Args:   rawCode  - command to send
   *         dataFunc - function to call with response data
   *         doneFunc - function to call if the command will have no response
   */
  execute(rawCode, dataFunc, doneFunc) {
    this.connection.setDataFunc(dataFunc);
    this.connection.send(rawCode);
    this.commandsProcessed++;
  }
}

module.exports = VirtualExecutor;
