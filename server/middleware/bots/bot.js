const Promise = require('bluebird');
const StateMachine = require('javascript-state-machine');
const _ = require('underscore');
const request = require('request-promise');
const uuidGenerator = require('node-uuid');
const ip = require('ip');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');

const SerialCommandExecutor = require('./comProtocols/serial/executor');
const HardwareHubExecutor = require('./comProtocols/hardwarehub/executor');
const TelnetExecutor = require('./comProtocols/telnet/executor');
const VirtualExecutor = require('./comProtocols/virtual/executor');
const CommandQueue = require('./commandQueue');

/**
 * This is a Bot class representing hardware that can process jobs.
 * All commands to the bot are passed to it's queue and processed sequentially
 *
 * The bot's state machine abstracts any job states (i.e. pause/resume/cancel)
 * to be handled by the Job API. In other words, in order to pause/resume/cancel a bot,
 * you must send that command to the job. This will pass down events accordingly to the bot
 *
 * @param {Object} app - The parent Koa app.
 * @param {string} settings - The settings, as retreived from the database.
 *
 */
const Bot = function Bot(app, BotClass, inputSettings = {}) {
  BotClass.call(this, app);
  _.extend(this.settings, inputSettings);

  this.queue = undefined;
  this.currentJob = undefined;
  this.lr = undefined; // buffered file line reader
  this.currentLine = undefined;

  this.status = {
    sensors: {
      t0: undefined,
    },
    position: {
      x: undefined,
      y: undefined,
      z: undefined,
      e: undefined,
    },
  };

  this.settings.uuid = this.settings.uuid === undefined ? uuidGenerator.v1(): this.settings.uuid;

  this.fsmEvents = [
    /* eslint-disable no-multi-spaces */
    { name: 'detect',             from: 'unavailable',         to: 'detecting'           },
    { name: 'detectFail',         from: 'detecting',           to: 'unavailable'         },
    { name: 'detectDone',         from: 'detecting',           to: 'ready'               },
    { name: 'connect',            from: 'ready',               to: 'connecting'          },
    { name: 'connect',            from: 'connected',           to: 'connected'           },
    { name: 'connectFail',        from: 'connecting',          to: 'ready'               },
    { name: 'connectDone',        from: 'connecting',          to: 'connected'           },
    { name: 'start',              from: 'connected',           to: 'startingJob'         },
    { name: 'startFail',          from: 'startingJob',         to: 'connected'           },
    { name: 'startDone',          from: 'startingJob',         to: 'processingJob'       },
    { name: 'stop',               from: 'processingJob',       to: 'stopping'            },
    { name: 'stopDone',           from: 'stopping',            to: 'connected'           },
    { name: 'stopFail',           from: 'stopping',            to: 'connected'           },
    { name: 'jobToGcode',         from: 'processingJob',       to: 'processingJobGcode'  },
    { name: 'jobGcodeFail',       from: 'processingJobGcode',  to: 'processingJob'       },
    { name: 'jobGcodeDone',       from: 'processingJobGcode',  to: 'processingJob'       },
    { name: 'parkToGcode',        from: 'parked',              to: 'processingParkGcode' },
    { name: 'parkGcodeFail',      from: 'processingParkGcode', to: 'parked'              },
    { name: 'parkGcodeDone',      from: 'processingParkGcode', to: 'parked'              },
    { name: 'disconnect',         from: 'connected',           to: 'disconnecting'       },
    { name: 'disconnect',         from: 'ready',               to: 'ready'               },
    { name: 'disconnectFail',     from: 'disconnecting',       to: 'connected'           },
    { name: 'disconnectDone',     from: 'disconnecting',       to: 'ready'               },
    { name: 'park',               from: 'connected',           to: 'parking'             },
    { name: 'parkFail',           from: 'parking',             to: 'connected'           },
    { name: 'parkDone',           from: 'parking',             to: 'parked'              },
    { name: 'unpark',             from: 'parked',              to: 'unparking'           },
    { name: 'unparkFail',         from: 'unparking',           to: 'connected'           },
    { name: 'unparkDone',         from: 'unparking',           to: 'connected'           },
    { name: 'parkJob',            from: 'processingJob',       to: 'parkingJob'          },
    { name: 'parkJobFail',        from: 'parkingJob',          to: 'processingJob'       },
    { name: 'parkJobDone',        from: 'parkingJob',          to: 'parkedJob'           },
    { name: 'unparkJob',          from: 'parkedJob',           to: 'unparkingJob'        },
    { name: 'unparkJobFail',      from: 'unparkingJob',        to: 'parkedJob'           },
    { name: 'unparkJobDone',      from: 'unparkingJob',        to: 'processingJob'       },
    { name: 'unplug',             from: '*',                   to: 'unavailable'         },
    /* eslint-enable no-multi-spaces */
  ];

  this.fsm = StateMachine.create({
    initial: 'unavailable',
    error: (one, two) => {
      const errorMessage = `Invalid ${this.settings.name} bot state change action "${one}". State at "${two}".`;
      this.logger.error(errorMessage);
      throw errorMessage;
    },
    events: this.fsmEvents,
    callbacks: {
      onenterstate: (event, from, to) => {
        this.logger.info(`Bot ${this.settings.name} event ${event}: Transitioning from ${from} to ${to}.`);
        try {
          this.app.io.broadcast('botEvent', {
            uuid: this.settings.uuid,
            event: 'update',
            data: this.getBot(),
          });
        } catch (ex) {
          this.logger.error('Update bot socket error', ex);
        }
        if (Array.isArray(this.subscribers)) {
          Promise.map(this.subscribers, bsync((subscriber) => {
            const requestParams = {
              method: 'POST',
              uri: subscriber,
              body: {
                command: 'updateState',
                body: {
                  event,
                  bot: this.getBot(),
                },
              },
              json: true,
            };
            try {
              bwait(request(requestParams));
            } catch (ex) {
              this.logger.error(`Failed to update endpoint "${subscriber}": ${ex}`);
            }
          }, { concurrency: 5 }));
        }
      },
    },
  });

  // Set the bot's uuid to the port, for bots that use an IP address
  switch (this.info.connectionType) {
    case 'virtual':
      this.setPort(`http://localhost:${process.env.PORT}/v1/bots/${this.settings.uuid}`);
      break;
    case 'hardwarehub':
    case 'telnet':
      this.setPort(this.settings.endpoint);
      break;
    default:
      // do nothing
      break;
  }
  this.subscribe();
};

/*
 * get a json friendly description of the Bot
 */
Bot.prototype.getBot = function getBot() {
  const currentJob = this.currentJob === undefined ? undefined : this.currentJob.getJob();
  return {
    state: (this.fsm !== undefined && this.fsm.current !== undefined) ? this.fsm.current : 'unavailable',
    status: this.status,
    port: this.port,
    settings: this.settings,
    subscribers: this.subscribers,
    info: this.info,
    currentJob,
  };
};

Bot.prototype.subscribe = bsync(function subscribe() {
  switch (this.info.connectionType) {
    // In case there is no detection method required, detect the device and
    // move directly to a "ready" state
    case 'hardwarehub':
      // add a subscriber
      const requestParams = {
        method: 'POST',
        uri: this.port,
        body: {
          command: 'addSubscriber',
          subscriberEndpoint: `http://${ip.address()}:${process.env.PORT}/v1/bots/${this.settings.uuid}`,
        },
        json: true,
      };
      try {
        bwait(request(requestParams));
        this.detect();
      } catch (ex) {
        this.logger.error(`Failed to subscribe to bot endpoint ${this.port}. ${ex}`);
      }
      break;
    case 'telnet':
    case 'virtual':
    case 'conductor':
      this.detect();
      break;
    default:
      // Do nothing
  }
});

Bot.prototype.updateBot = bsync(function updateBot(newSettings) {
  const settingsToUpdate = {};

  // parse the existing settings
  // if any of the settings passed in match the existing settings
  // add them to "settingsToUpdate" object.

  // NOTE if we are passing object details that do not match existing settings
  // we don't throw an error
  for (const botSetting in this.settings) {
    if (this.settings.hasOwnProperty(botSetting)) {
      for (const newSetting in newSettings) {
        if (newSettings.hasOwnProperty(newSetting)) {
          if (botSetting === newSetting) {
            settingsToUpdate[newSetting] = newSettings[newSetting];
          }
        }
      }
    }
  }

  if (typeof settingsToUpdate.custom === 'object') {
    settingsToUpdate.custom = JSON.stringify(settingsToUpdate.custom);
  }

  if (settingsToUpdate.endpoint !== undefined) {
    this.setPort(settingsToUpdate.endpoint);
  }

  // If the bot is persistent, then update the database with new settings
  const dbBots = bwait(this.app.context.bots.BotModel.findAll());
  const dbBot = _.find(dbBots, (bot) => {
    return bot.dataValues.uuid === this.settings.uuid;
  });
  if (dbBot !== undefined) {
    this.logger.info(`About to update bot ${this.settings.name} settings from ${JSON.stringify(this.settings)} to ${JSON.stringify(settingsToUpdate)}`);
    bwait(dbBot.update(settingsToUpdate));
  }

  // Revert the custom database field to a json object
  if (typeof settingsToUpdate.custom === 'string') {
    settingsToUpdate.custom = JSON.parse(settingsToUpdate.custom);
  }

  for (const newSetting in settingsToUpdate) {
    if (settingsToUpdate.hasOwnProperty(newSetting) && this.settings.hasOwnProperty(newSetting)) {
      this.settings[newSetting] = settingsToUpdate[newSetting];
    }
  }

  this.app.io.broadcast('botEvent', {
    uuid: this.settings.uuid,
    event: 'update',
    data: this.getBot(),
  });

  return this.getBot();
});

/*
 * Set the port of the bot.
 */
Bot.prototype.setPort = function(port) {
  // Validate?
  this.port = port;
};

/*
 * This is the logic for parsing any commands sent to the Bot API
 * In all cases, the API does not wait for the command to be completed, instead
 * the bot enters the appropriate transitional state, followed by either
 * "done" or "fail" events and corresponding state transitions
 */
Bot.prototype.processCommand = bsync(function processCommand(command, params) {
  if (typeof this.commands[command] !== 'function') {
    throw `Command ${command} not supported.`;
  }
  try {
    // const reply = bwait(this.prototype[command](this, params));
    const reply = bwait(this.commands[command](this, params));
    return reply;
  } catch (ex) {
    return ex;
  }
});

// Set up the appropriate command executor and validator for a given connection type
Bot.prototype.detect = function detect() {
  this.fsm.detect();
  try {
    let executor;
    let validator;
    // Set up the validator and executor
    switch (this.info.connectionType) {
      case 'serial': {
        const openPrime = this.settings.openString == undefined ? 'M501' : this.settings.openString;
        executor = new SerialCommandExecutor(
          this.app,
          this.port,
          this.info.baudrate,
          openPrime,
          this
        );
        validator = this.validateSerialReply;
        break;
      }
      case 'hardwarehub': {
        executor = new HardwareHubExecutor(
          this.app,
          this.port
        );
        validator = this.validateHardwareHubReply;
        break;
      }
      case 'virtual':
      case 'conductor': {
        executor = new VirtualExecutor(this.app);
        validator = this.validateSerialReply;
        break;
      }
      case 'telnet': {
        executor = new TelnetExecutor(
          this.app,
          this.port
        );
        validator = this.validateSerialReply;
        break;
      }
      default: {
        const errorMessage = `connectionType "${this.info.connectionType}" is not supported.`;
        throw errorMessage;
      }
    }

    // Set up the bot's command queue
    this.queue = new CommandQueue(
      executor,
      this.expandCode,
      _.bind(validator, this)
    );

    this.fsm.detectDone();
  } catch (ex) {
    this.logger.error(ex);
    this.fsm.detectFail();
  }
};

/**
 * expandCode()
 *
 * Expand simple commands to gcode we can send to the bot
 *
 * Args:   code - a simple string gcode command
 * Return: a gcode string suitable for the hardware
 */
Bot.prototype.expandCode = function expandCode(code) {
  return `${code}\n`;
}

/**
 * validateSerialReply()
 *
 * Confirms if a reply contains 'ok' as its last line.  Parses out DOS newlines.
 *
 * Args:   reply - The reply from a bot after sending a command
 * Return: true if the last line was 'ok'
 */
Bot.prototype.validateSerialReply = function validateSerialReply(command, reply) {
  const lines = reply.toString().split('\n');
  let ok;
  try {
    ok = _.last(lines).indexOf('ok') !== -1;
  } catch (ex) {
    this.logger.error('Bot validate serial reply error', reply, ex);
  }
  return ok;
};

/**
 * validateHttpReply()
 *
 * Confirms if a reply contains 'ok' as its last line.  Parses out DOS newlines.
 * If the bot is streaming, it will reply with "true" instead of the actual text
 *
 * Args:   reply - The reply from a bot after sending a command
 * Return: true if the last line was 'ok'
 */
Bot.prototype.validateHardwareHubReply = function validateHardwareHubReply(command, reply) {
  let ok = true;
  if (reply.status !== 200) {
    ok = false;
  }
  if (String(reply.data) === 'false') {
    ok = false;
  }
  return ok;
};

/**
 * validateVirtualReply()
 *
 * Confirms if a reply contains 'ok' as its last line.  Parses out DOS newlines.
 *
 * Args:   reply - The reply from a bot after sending a command
 * Return: true if the last line was 'ok'
 */
Bot.prototype.validateVirtualReply = function validateVirtualReply(command, reply) {
  const lines = reply.toString().split('\n');
  const ok = _.last(lines).indexOf('ok') !== -1;
  return ok;
};

/**
 * addOffset()
 *
 * Takes a gcode command and offsets per the bots settings, if a G0 or G1 command is issued
 *
 * Args:   command - The command to be offset
 * Return: offsetCommand - The offset command
 */
Bot.prototype.addOffset = function addOffset(command) {
  let offsetCommand = command;
  try {
    if (offsetCommand.indexOf('G1') !== -1 || offsetCommand.indexOf('G0') !== -1) {
      offsetCommand = this.offsetAxis(offsetCommand, 'X');
      offsetCommand = this.offsetAxis(offsetCommand, 'Y');
      offsetCommand = this.offsetAxis(offsetCommand, 'Z');
    }
  } catch (ex) {
    this.logger.error('index of error on bot AddOffset', ex, command);
  }
  return offsetCommand;
};


/**
 * offsetAxis()
 *
 * Takes a gcode command and offsets an individual axis per the bot's settings
 *
 * Args:   command       - The command to be offset
 *         axis          - The axis to be offset
 * Return: offsetCommand - The offset command
 */
Bot.prototype.offsetAxis = function offsetAxis(command, axis) {
  let offsetCommand = command;
  try {
    if (offsetCommand.indexOf(axis) !== -1) {
      const axisArray = offsetCommand.split(axis);
      const before = axisArray[0];
      const splitArray = axisArray[1].split(' ');
      const middle = axis + Number(Number(splitArray[0]) + Number(this.settings['offset' + axis])).toFixed(4);
      let end = '';
      if (splitArray.length > 1) {
        for (let i = 1; i < splitArray.length; i++) {
          end += ' ' + splitArray[i];
        }
      }
      offsetCommand = before + middle + end;
    }
  } catch (ex) {
    this.logger.error('Error when offsetting axis', command, axis, ex);
  }
  return offsetCommand;
};

Bot.prototype.addSpeedMultiplier = function addSpeedMultiplier(command) {
  return command;
};

Bot.prototype.addFeedMultiplier = function addFeedMultiplier(command) {
  return command;
};

module.exports = Bot;
