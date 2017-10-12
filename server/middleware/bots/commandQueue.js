/** *****************************************************************************
 * commandQueue.js
 *
 * Manage a queue of simple or complex commands to send to a device.
 * Command objects are fairly free form and can be direct gcode or callbacks.
 * A regular heartbeat is maintained to check on the queue periodically, and
 * the queue is emptied each time it is found to be full.
 *
 * Commands may be appended (the normal pattern) or prepended in which case
 * they run immediately after the currently running command (good for splicing
 * in status checks during long gcode sequences)
 *
 * Commands may only be sent if a connection to a device is open.
 *
 * Opening, closing and executing commands is done by an executor object
 * which fulfills the interface:
 * Its interface is:
 *   execute(inRawCommand, inDataFunc(inData), inDoneFunc())
 *       inRawCommand       : a command string suitable for the device
 *       inDataFunc(inData) : a function the executor calls with response data
 *       inDoneFunc()       : a function the executor calls if it knows the
 *                              command is done.  Some executed commands will
 *                              allow the data function to recognize command
 *                              completion, others can invoke it directly if
 *                              there is no response data to forward on.
 *   open(inDoneFunc(<true if successfully opened>))
 *   close(inDoneFunc(<true if successfully closed>))
 *
 * Each command may be either a simple gcode string command or a more complex
 * command of the form:
 * {
 *     code         : String   <simple gcode here, (no prefix, suffix, checksum,
 *                                                  etc.)>,
 *     rawCode      : String   <exact gcode here>,
 *     preCallback  : function (inCommand) <called before command executes>
 *     processData  : function (inCommand, inData)
 *                             <function to process replies, must return true
 *                              when it sees the end of the command reply>
 *     postCallback : function (inCommand) <called after command done is received>
 *     open         : anything <open a connection to the device>
 *     close        : anything <close the connection to the device>
 *     delay        : ms <ms to delay before next command>
 *     noData       : Set to true if the command returns no data and we should
 *                      move on to the next command.
 *     commandId    : integer <Unique command identifier, set by the CommandQueue>
 *     queue        : CommandQueue <set by CommandQueue when the command
 *                                  is being run>
 * }
 *
 * open, close, delay and a rawCode are mutually exclusive.  If more than one
 * is defined in a command, one will be chosen but don't rely on a set ordering.
 *
 * A note on pre and post callbacks:
 * One might think you could just have a single 'callback' command and splice
 * them in the command queue between other commands and in general this would
 * accomplish much of the same goal.
 * Where that more simplistic model does not work is in affiliating the callback
 * to a command execution in time.  Between one command and another we allow the
 * node event system to be free so there is no timing guarantee from command to
 * command.
 * Specific pre and post callbacks allows for a sequence of:
 * <preCallback>, <command execution>, wait for command response, <postCallback>
 * without anything inbetween.
 * A more generic 'callback' command can be had by simply issuing a:
 * { preCallack : <callback> }
 * command.  With no rawCode to execute, this is simply a callback sychronized
 * between commands (with the expected node event queue delays)
 ***************************************************************************** */
const uuidv4 = require('uuid/v4');
const bluebird = require('bluebird');

/**
 * CommandQueue()
 *
 * Constructor, set up our queue object and processing state
 *
 * Args:   inExecutor            - executor object
 *         inExpandCodeFunc      - expands a simple code to a rawCode
 *         inReponseFunc(inData) - default response validation function.
 *                                 Returns true when command is complete
 */
const CommandQueue = function (inExecutor, inExpandCodeFunc, inResponseFunc) {
  if (!inExecutor) {
    logger.error('A CommandQueue requires an executor or it is useless');
  }

  // To send a command, we must an open connection to the device.  Note this
  // is separate from the Virtual Driver concept of a connection to the
  // printer, which has to do with knowing a device is present and that we
  // can connect to it.
  this.mOpen = false;

  this.mQueue = [];
  this.mCurrentCommand = undefined;
  this.mCommandId = uuidv4(); // each command has a unique id

  // When processing commands nextCommand() runs every event loop until
  // it sees that this is false
  this.mProcessing = false;

  this.mExpandCodeFunc = inExpandCodeFunc;
  this.mResponseFunc = inResponseFunc;

  // The executor is an object that executes commands on a device.  It is
  // also responsible for opening and closing a connection to the device.
  this.mExecutor = inExecutor;
};

/** *****************************************************************************
 * public interface
 ****************************************************************************** */

CommandQueue.OPEN = function () {
  return { open: true };
};
CommandQueue.CLOSE = function () {
  return { close: true };
};

/**
 * isOpen()
 *
 * Simple accessor
 */
CommandQueue.prototype.isOpen = function () {
  return this.mOpen;
};

/**
 * getExecutor()
 *
 * Simple accessor
 */
CommandQueue.prototype.getExecutor = function () {
  return this.mExecutor;
};

/**
 * pause()
 *
 * Pause a running command queue.  Idempotent, so no effect if
 * we were already paused
 */
CommandQueue.prototype.pause = function () {
  this.mProcessing = false;
};

/**
 * resume()
 *
 * Resume a paused command queue.  Idempotent, so no effect if
 * we were not paused.
 */
CommandQueue.prototype.resume = function () {
  this.mProcessing = true;
  setImmediate(this.nextCommand.bind(this));
};

/**
 * clear()
 *
 * Clear the queue.  Allows the currently active command to complete
 */
CommandQueue.prototype.clear = function () {
  // dump all of our queued commands
  this.mQueue = [];
  this.pause();
  this.mCurrentCommand = undefined;
};

/**
 * queueCommands()
 *
 * Queues up commands by appending them to the end of the queue
 */
CommandQueue.prototype.queueCommands = function () {
  const commands = CommandQueue.prototype.expandCommands.apply(this, arguments);

  if (commands) {
    const oldSize = this.mQueue.length;
    this.mQueue = this.mQueue.concat(commands);
    if (oldSize === 0) {
      this.resume(); // with commands, we make sure we process them
    }
  }
};

/**
 * createSequentialCommands()
 *
 * Takes an array of commands and returns an array with a single command
 * The postCallback of the single command will call the second command
 * The second command's postcallback will call the third command... etc...
 */
CommandQueue.prototype.createSequentialCommands = function (commands) {
  for (let i = commands.length - 1; i > 0; i--) {
    const current_index = i;
    const oldPostcallback =
      commands[current_index - 1] &&
      typeof commands[current_index - 1].postCallback === 'function' &&
      commands[current_index - 1].postCallback;
    commands[current_index - 1].postCallback = () => {
      this.prependCommands(commands[current_index]);

      // Note: calling the oldPostcallback last so that
      // no other function can prepend commmands in front of the oldpostcallback's prependCommands function
      if (oldPostcallback) {
        oldPostcallback();
      }
    };
  }
  return [commands[0]];
};

/**
 * queueSequentialCommands()
 *
 * Queues up commands by appending them to the end of the queue
 * Each sequential command is prepended in the prior command's postcallback
 */
CommandQueue.prototype.queueSequentialCommands = function () {
  const commands = CommandQueue.prototype.expandCommands.apply(this, arguments);

  if (commands) {
    const oldSize = this.mQueue.length;
    const singleCommand = this.createSequentialCommands(commands);
    // Turn array of commands into sequential commands
    this.mQueue = this.mQueue.concat(singleCommand);
    if (oldSize === 0) {
      this.resume(); // with commands, we make sure we process them
    }
  }
};

/**
 * prependSequentialCommands()
 *
 * Queues up commands by appending them to the end of the queue
 * Each sequential command is prepended in the prior command's postcallback
 */
CommandQueue.prototype.prependSequentialCommands = function () {
  const commands = CommandQueue.prototype.expandCommands.apply(this, arguments);

  if (commands) {
    const singleCommand = this.createSequentialCommands(commands);
    this.mQueue = singleCommand.concat(this.mQueue);
    this.resume(); // with commands, we make sure we process them
  }
};

/**
 * prependCommands()
 *
 * Queues up commands by prepending them at the front of the queue
 */
CommandQueue.prototype.prependCommands = function () {
  const commands = CommandQueue.prototype.expandCommands.apply(this, arguments);

  if (commands) {
    this.mQueue = commands.concat(this.mQueue);
    this.resume(); // with commands, we make sure we process them
  }
};

/**
 * cleanup()
 *
 * Dump our command queue, close our executor and clear our commandProcessor
 * heartbeat.
 *
 * Args:   N/A
 * Return: N/A
 */
CommandQueue.prototype.cleanup = function () {
  const that = this;

  // Immediately clear anything queued
  this.clear();

  // Queue the close/cleanup if we need to
  if (this.mCurrentCommand || this.isOpen()) {
    // Queue a close (if open) and postCloseCleanup after it.
    const command = {};
    if (this.isOpen()) {
      command.close = true;
    }
    command.postCallback = function (inCommand) {
      that.postCloseCleanup();
    };
    this.prependCommands(command);
  } else {
    // If there is nothing currently running nor a need to close,
    // we can proceed directly to the postCloseCleanup
    this.postCloseCleanup();
  }
};

/**
 * postCloseCleanup()
 *
 * Cleanup to be done after we have closed our connection
 */
CommandQueue.prototype.postCloseCleanup = function () {
  this.pause();
};

/** *****************************************************************************
 * Internal implementation
 ****************************************************************************** */

/**
 * expandCommands()
 *
 * Commands are generic objects but for convenience can have a very flexible
 * form.
 * Allows multiple arguments, arrays of commands and even nesting if you find
 * that useful. expandCommands() allows simple or complex commands as documented below.
 *
 * Args:   arguments - Each argument may be either a simple gcode string command or a
 *                     more complex command object.
 *
 *         examples:
 *           with a code expand function of "~<code>\r\n':
 *
 *           this.expandCommands('M29')               -> [ { rawCode : '~M29\r\n' } ]
 *           this.expandCommands('M119', 'M105')      -> [ { rawCode : '~M29\r\n' },
 *                                                         { rawCode : '~M105\r\n' } ]
 *           this.expandCommands(['M119', 'M105'])    -> [ { rawCode : '~M29\r\n' },
 *                                                         { rawCode : '~M105\r\n' } ]
 *           this.expandCommands('M29', ['M119', ['M29', 'M114'], 'M23'], 'G4 P') -> [
 *               { rawCode : '~M29\r\n' },  { rawCode : '~M119\r\n' }, { rawCode : '~M29\r\n' },
 *               { rawCode : '~M114\r\n' }, { rawCode : '~M23\r\n' },  { rawCode : '~G4 P\r\n' } ]
 *
 * Return: array of expanded commands
 */
CommandQueue.prototype.expandCommands = function () {
  let commandArray = [];
  let argIndex,
    arrayIndex;
  let command;
  // Process all arguments in order
  for (argIndex = 0; argIndex < arguments.length; argIndex++) {
    command = arguments[argIndex];

    // Simple string is converted to a command object with a rawCode
    if (typeof command === 'string') {
      commandArray = commandArray.concat(this.expandCommands({ code: command })); // upconvert to simple command
    } else if (Array.isArray(command)) {
      // For an array, process each command in order
      for (arrayIndex = 0; arrayIndex < command.length; arrayIndex++) {
        commandArray = commandArray.concat(this.expandCommands(command[arrayIndex]));
      }
    } else {
      // Any non-string, non-array is treated as a command object.  If no 'rawCode'
      // exists, expand any present simple 'code' command into a 'rawCode'
      if (!command.rawCode && command.code) {
        command.rawCode = this.mExpandCodeFunc(command.code);
      }

      commandArray = commandArray.concat(command);
    }
  }

  return commandArray;
};

/**
 * nextCommand()
 *
 * Process the next command, if we are not currently processing and there
 * are commands in our queue.
 *
 * Args:   N/A
 * Return: N/A
 */
CommandQueue.prototype.nextCommand = function () {
  // If we have no current command but commands in the queue, pop and execute
  // On commands expecting a response to parse we will retain a current
  // command and exit this loop, but for immediate commands there will be no
  // queue delay.
  while (!this.mCurrentCommand && this.mQueue.length > 0 && this.mProcessing) {
    // Pop our next command
    this.mCurrentCommand = this.mQueue.shift();

    // Assign a unique command identifier
    this.mCommandId = uuidv4();
    this.mCurrentCommand.commandId = this.mCommandId;

    // Give it a pointer back to us so it can ask us to move on
    this.mCurrentCommand.queue = this;

    // Now send it off
    this.sendCommand();
  }

  // If we are out of commands, pause our processing until we receive some
  if (this.mQueue.length === 0) {
    this.pause();
  } else {
    // Keep processing commands
    if (this.mProcessing) {
      this.resume();
    }
  }
};

/**
 * sendCommand()
 *
 * Sends the current command to the device, with proper pre and post behavior.
 *
 * Args:   N/A
 * Return: N/A
 */
CommandQueue.prototype.sendCommand = async function () {
  let command,
    rawCode,
    executorWillProcess;

  if (!this.mCurrentCommand) {
    // logger.error('sendCommand() called with no current command');
    return;
  }
  command = this.mCurrentCommand;

  // Only open or delay commands may be processed if the connection is closed
  if (!this.isOpen() && !command.open && !command.delay) {
    // logger.error('Cannot send commands without an open connection:', command);
    return;
  }

  // Call any preCall back functions before we send the command to the executor
  if (typeof command.preCallback === 'function') {
    // logger.debug('calling preCallback:');
    command.preCallback(command);
  }

  // open, close, delay and rawCode are mutually exclusive.  We rely on
  // JavaScript converting true to the number 1 and "add" up the presence of
  // these commands and allow us to issue a log error for more than one.
  const exclusive = !!command.open + !!command.close + !!command.delay + !!command.rawCode;
  if (exclusive > 1) {
    // logger.error('open, close, delay and rawCode are mutually exclusive.', command);
  }

  if (command.open) {
    this.mExecutor.open(this.openProcessed.bind(this, command));
  } else if (command.close) {
    this.mExecutor.close(this.closeProcessed.bind(this, command));
  } else if (command.delay) {
    await bluebird.delay(command.delay);
    await this.commandProcessed(command);
  } else if (command.rawCode) {
    // If we have a command code, send it and wait on the response.  That
    // response is responsible for calling commandProcessed()
    rawCode = command.rawCode;
    // logger.debug('sending command:', rawCode.split('\n')[0]);
    const dataFunc = this.processData.bind(this, command);
    const doneFunc = this.commandProcessed.bind(this, command);
    this.mExecutor.execute(rawCode, dataFunc, doneFunc);
    if (command.noData) {
      await this.commandProcessed(command);
    }
  } else {
    // Unless our executor will process the command response, move on.
    // open(), close() and execute() wait on the executor and execute() is
    // only called if the command has a rawCode.  delay will process the
    // command after its timeout expiration.
    await this.commandProcessed(command);
  }
};

/**
 * processData()
 *
 * Our processData function is called by our executor's data response
 * and we in turn call to any command specific processData() function.
 * Should one exist, a response of 'true' indicates it is time to move
 * on to the new command.
 *
 * Args:   inCommand - command for which we are processing a response
 *         inData    - data of the command response
 * Return: N/A
 */
CommandQueue.prototype.processData = async function (inCommand, inData) {
  if (!this.mCurrentCommand || inCommand.commandId !== this.mCommandId) {
    logger.warn(
      `Command ${inCommand.commandId} is no longer receiving data, ignoring:`,
      inData.toString(),
    );
    return;
  }
  let commandComplete = true; // if no data processor, we're done

  commandComplete = await this.mResponseFunc(inCommand, inData);

  if (typeof this.mCurrentCommand.processData === 'function') {
    commandComplete = await this.mCurrentCommand.processData(inCommand, inData);
  }

  if (commandComplete) {
    await this.commandProcessed(inCommand);
  }
};

/**
 * commandProcessed()
 *
 * Passed as the 'inDoneFunc' to the executor execute() and also used for direct
 * command completion, to mark the current command complete.
 * It will call the postCallback and clear our current command so the CommandQueue
 * can move on to the next.
 *
 * Args:   inCommand - command we have finished processing
 * Return: N/A
 */
CommandQueue.prototype.commandProcessed = async function (inCommand) {
  if (inCommand.commandId !== this.mCommandId) {
    // logger.error('Command ids are out of sync. commandProcessed(' +
    //              inCommand.commandId + ') ' +
    //              'called when the queue is on:', this.mCommandId);
  }

  // Now call our postCallback
  if (this.mCurrentCommand && typeof this.mCurrentCommand.postCallback === 'function') {
    // logger.debug('calling postCallback:');
    await this.mCurrentCommand.postCallback(inCommand);
  }

  this.mCurrentCommand = undefined;
};

/**
 * openProcessed()
 *
 * Passed as the 'inDoneFunc' to the executor open(), this is called by the
 * executor to let us know we are in an open state, or that we failed to
 * open.
 *
 * Args:   inCommand  - the open command being processed
 *         inSuccess  - true if the open command succeeded
 * Return: N/A
 */
CommandQueue.prototype.openProcessed = async function (inCommand, inSuccess) {
  if (inCommand.commandId !== this.mCommandId) {
    // logger.error('openProcessed (' + inCommand.commandId + ') mismatch:', this.mCommandId);
  }

  if (inSuccess) {
    this.mOpen = true;
  } else {
    // logger.error('executor open() failed');
  }

  await this.commandProcessed(inCommand);
};

/**
 * closeProcessed()
 *
 * Passed as the 'inDoneFunc' to the executor close(), this is called by the
 * executor to let us know we are in an closed state, or that we failed to
 * close.
 *
 * Args:   inCommand  - the open command being processed
 * Return: N/A
 */
CommandQueue.prototype.closeProcessed = async function (inCommand, inSuccess) {
  if (inCommand.commandId !== this.mCommandId) {
    // logger.error('closeProcessed (' + inCommand.commandId + ') mismatch:', this.mCommandId);
  }

  if (inSuccess) {
    this.mOpen = false;
  } else {
    // logger.error('executor close() failed');
  }

  await this.commandProcessed(inCommand);
};

module.exports = CommandQueue;
