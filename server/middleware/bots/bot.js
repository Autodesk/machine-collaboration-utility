const StateMachine = require('javascript-state-machine');
const _ = require('lodash');
const request = require('request-promise');
const uuidGenerator = require('uuid/v4');
const ip = require('ip');
const path = require('path');
const gcodeToObject = require('gcode-json-converter').gcodeToObject;
const objectToGcode = require('gcode-json-converter').objectToGcode;

const SerialCommandExecutor = require('./comProtocols/serial/executor');
const TelnetExecutor = require('./comProtocols/telnet/executor');
const VirtualExecutor = require('./comProtocols/virtual/executor');
const CommandQueue = require('./commandQueue');

const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));

/**
 * This is a Bot class representing hardware that can process jobs.
 * All commands to the bot are passed to it's queue and processed sequentially
 *
 * @param {Object} app - The parent Koa app.
 * @param {Object} inputSettings - Details about the bot which are stored and can be changed
 * @param {Object} info - Details about the bot which are static
 * @param {Object} commands - Functions which can be executed by the bot
 *
 */
class Bot {
  constructor(app, presets, inputSettings) {
    this.app = app;
    this.logger = app.context.logger;

    // Since we will edit settings, we want a clone of the default settings
    this.settings = Object.assign({}, presets.settings);
    _.extend(this.settings, inputSettings);
    // Add a UUID if one doesn't exist yet
    this.settings.uuid = this.settings.uuid || uuidGenerator();

    this.info = presets.info;

    this.commands = presets.commands;

    this.commands.initialize(this);

    this.fsm = this.createStateMachine();
    this.discover();
  }

  createStateMachine() {
    const fsm = StateMachine.create({
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
    return fsm;
  }

  /*
  * get a json friendly description of the Bot
  */
  getBot() {
    const currentJob = this.currentJob === undefined ? undefined : this.currentJob.getJob();
    return {
      state: (this.fsm !== undefined && this.fsm.current !== undefined) ? this.fsm.current : 'unavailable',
      status: this.status,
      settings: this.settings,
      info: this.info,
      port: this.port,
      currentJob,
    };
  }

  async updateBot(newSettings) {
    // parse the existing settings
    // if any of the settings passed in match the existing settings
    // add them to "settingsToUpdate" object.

    // NOTE if we are passing object details that do not match existing settings
    // we don't throw an error, we just ignore them
    const settingsToUpdate = {};

    _.entries(newSettings).forEach(([settingKey, settingValue]) => {
      if (this.settings[settingKey] !== undefined) {
        settingsToUpdate[settingKey] = settingValue;
      }
    });

    if (typeof settingsToUpdate.custom === 'object') {
      settingsToUpdate.custom = JSON.stringify(settingsToUpdate.custom);
    }

    // If the bot is persistent, then update the database with new settings
    const dbBots = await this.app.context.bots.BotModel.findAll();
    const dbBot = _.find(dbBots, (bot) => {
      return bot.dataValues.uuid === this.settings.uuid;
    });

    // Update the database
    if (dbBot !== undefined) {
      this.logger.info(`About to update bot ${this.settings.name} settings from ${JSON.stringify(this.settings)} to ${JSON.stringify(settingsToUpdate)}`);
      await dbBot.update(settingsToUpdate);
    }

    // Revert the custom database field to a json object
    if (typeof settingsToUpdate.custom === 'string') {
      settingsToUpdate.custom = JSON.parse(settingsToUpdate.custom);
    }

    // pass the new settings to the bot's setting object
    _.entries(settingsToUpdate).forEach(([settingKey, settingValue]) => {
      if (this.settings[settingKey] !== undefined) {
        this.settings[settingKey] = settingValue;
      }
    });

    this.app.io.broadcast('botEvent', {
      uuid: this.settings.uuid,
      event: 'update',
      data: this.getBot(),
    });

    return this.getBot();
  }

  /*
   * Set the port of the bot.
   */
  setPort(port) {
    // Validate?
    this.port = port;
  };

  /*
   * This is the logic for parsing any commands sent to the Bot API
   * In all cases, the API does not wait for the command to be completed, instead
   * the bot enters the appropriate transitional state, followed by either
   * "done" or "fail" events and corresponding state transitions
   */
  async processCommand(command, params) {
    const commandObj = this.commands[command];

    if (typeof commandObj !== 'function') {
      throw new Error(`Command ${command} not supported.`);
    }

    // TODO Consider always returning get bot plus any info or error, instead
    try {
      const reply = await commandObj(this, params);
      return reply;
    } catch (ex) {
      return ex;
    }
  }

  // Set up the appropriate command executor and validator for a given connection type
  discover(params = {}) {
    // Allow immediate discovery of virtual hardware or real hardware when the
    if (this.info.connectionType !== 'serial' || params.realHardware === true) {
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
    }
  }

  /**
   * expandCode()
   *
   * Expand simple commands to gcode we can send to the bot
   *
   * Args:   code - a simple string gcode command
   * Return: a gcode string suitable for the hardware
   */
  expandCode(code) {
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
  validateSerialReply(command, reply) {
    const lines = reply.toString().split('\n');
    let ok;
    try {
      ok = _.last(lines).indexOf('ok') !== -1;
    } catch (ex) {
      this.logger.error('Bot validate serial reply error', reply, ex);
    }
    return ok;
  }

  /**
   * validateVirtualReply()
   *
   * Confirms if a reply contains 'ok' as its last line.  Parses out DOS newlines.
   *
   * Args:   reply - The reply from a bot after sending a command
   * Return: true if the last line was 'ok'
   */
  validateVirtualReply(command, reply) {
    const lines = reply.toString().split('\n');
    const ok = _.last(lines).indexOf('ok') !== -1;
    return ok;
  }

  /**
   * addOffset()
   *
   * Takes a gcode command and offsets per the bots settings, if a G0 or G1 command is issued
   *
   * Args:   gcodeObject - The command to be offset
   * Return: offsetObject - The offset gcode Object
   */
  addOffset(gcodeObject) {
    if (gcodeObject.command === 'G0' || gcodeObject.command === 'G1') {
      if (gcodeObject.args.x) {
        gcodeObject.args.x += Number(this.settings.offsetX);
      }
      if (gcodeObject.args.y) {
        gcodeObject.args.y += Number(this.settings.offsetY);
      }
      if (gcodeObject.args.z) {
        gcodeObject.args.z += Number(this.settings.offsetZ);
      }
    }
  }


  /**
   * offsetAxis()
   *
   * Takes a gcode command and offsets an individual axis per the bot's settings
   *
   * Args:   command       - The command to be offset
   *         axis          - The axis to be offset
   * Return: offsetCommand - The offset command
   */
  offsetAxis(command, axis) {
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
  }
}

module.exports = Bot;
