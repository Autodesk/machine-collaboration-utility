const Promise = require('bluebird');
const StateMachine = require('javascript-state-machine');
const _ = require('underscore');
const request = require('request-promise');
const uuidGenerator = require('uuid/v4');
const ip = require('ip');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');
const path = require('path');

const SerialCommandExecutor = require('./comProtocols/serial/executor');
const HardwareHubExecutor = require('./comProtocols/hardwarehub/executor');
const TelnetExecutor = require('./comProtocols/telnet/executor');
const VirtualExecutor = require('./comProtocols/virtual/executor');
const CommandQueue = require('./commandQueue');

const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));

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

  // Variable for knowing whether or not to purge when unparking
  this.isDry = false;

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

  this.settings.uuid = this.settings.uuid === undefined ? uuidGenerator() : this.settings.uuid;

  this.fsm = StateMachine.create({
    initial: 'uninitialized',
    error: (one, two) => {
      const errorMessage = `Invalid ${this.settings.name} bot state change action "${one}". State at "${two}".`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    },
    events: botFsmDefinitions.fsmEvents,
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
      },
    },
  });

  this.discover();
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

Bot.prototype.updateBot = bsync(function updateBot(newSettings) {
  // parse the existing settings
  // if any of the settings passed in match the existing settings
  // add them to "settingsToUpdate" object.

  // NOTE if we are passing object details that do not match existing settings
  // we don't throw an error
  const settingsToUpdate = {};

  for (const [settingKey, settingValue] of _.pairs(newSettings)) {
    if (this.settings[settingKey] !== undefined) {
      settingsToUpdate[settingKey] = settingValue;
    }
  }

  if (typeof settingsToUpdate.custom === 'object') {
    settingsToUpdate.custom = JSON.stringify(settingsToUpdate.custom);
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

  for (const [settingKey, settingValue] of _.pairs(settingsToUpdate)) {
    if (this.settings[settingKey] !== undefined) {
      this.settings[settingKey] = settingValue;
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
Bot.prototype.setPort = function setPort(port) {
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
  const commandObj = this.commands[command];

  if (typeof commandObj !== 'function') {
    throw new Error(`Command ${command} not supported.`);
  }
  try {
    const reply = bwait(commandObj(this, params));
    return reply;
  } catch (ex) {
    return ex;
  }
});

// Set up the appropriate command executor and validator for a given connection type
Bot.prototype.discover = function discover() {

  this.fsm.discover();
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
        throw new Error(errorMessage);
      }
    }

    // Set up the bot's command queue
    this.queue = new CommandQueue(
      executor,
      this.expandCode,
      _.bind(validator, this)
    );

    this.fsm.initializationDone();
  } catch (ex) {
    this.logger.error(ex);
    this.fsm.initializationFail();
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
};

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
