'use strict';
/*******************************************************************************
 * printrbot.js
 *
 * Configure a specific version of the serial printer.
 *
 ******************************************************************************/
const _ = require('underscore');
const GcodeClient = require('./drivers/gcodeClient');
const SerialCommandExecutor = require('./drivers/serialCommandExecutor');
const Status = require('./status');
const logger = require('../logger');

// START GCodeClient API FUNCTIONS //

const cancelCommands = function cancelCommands(that) {
  return [
    'G91',
    'G1 Z10',
    'G90',
    'G28 Y',
  ];
};

const completeCommands = function completeCommands(that) {
  return [
    '',
  ];
};

const pauseCommands = function pauseCommands(that) {
  return {
    code: 'M114',
    processData: (inCommand, inReply) => {
      console.log('pause commands M114 reply', inReply);
      let newDestination = {
        'X': Number(inReply.split('X:')[1].split('Y:')[0]),
        'Y': Number(inReply.split('Y:')[1].split('Z:')[0]),
        'Z': Number(inReply.split('Z:')[1].split('E:')[0]),
        'E': Number(inReply.split('E:')[1].split(' Count')[0])
      };

      that.mResumeCommands = [
        'G1 Z' + newDestination.Z + ' F1000',
        'G1 E' + newDestination.E + ' F4000',
        'G1 F1000',
      ];
      console.log('new destination', newDestination);
      that.mQueue.prependCommands([
        'G1 E' + (newDestination.E - 5) + ' F4000',
        {
          code: 'G1 Z' + (newDestination.Z + 10) + 'F1000',
          postCallback: () => {
            that.mQueue.pause();
          },
        }
      ]);
      return true;
    },
  };
};

const parkCommands = function parkCommands(that) {
  return {
    code:'M114',
    processData: (inCommand, inReply) => {
      let preParkLocation = {
        'X': Number(inReply.split('X:')[1].split('Y:')[0]),
        'Z': Number(inReply.split('Z:')[1].split('E:')[0]),
      };

      logger.info('preParkLocation ', preParkLocation );

      that.mQueue.prependCommands(['G1 Y2 F3600']);

      if (preParkLocation.Z < 18) {
        that.mQueue.prependCommands(['G1 Y25 Z18 F3600']);
      }

      return true;
    },
  };
};

const unparkCommands = function unparkCommands(that, xEntry, dryJob) {
  const commandArray = [
    {
      code: 'M114',
      processData: (inCommand, inReply) => {
        const purgeArray = [];
        logger.info('Unparking: ', xEntry, '\t', dryJob);
        logger.info('xEntry Type: ', typeof(xEntry));
        logger.info('dry Type: ', typeof(dryJob));
        if (xEntry !== undefined) {
          logger.info('Unparking: Moving to entry X');
          purgeArray.push('G1 X' + xEntry + ' F3600');
        }
        if (dryJob.toLowerCase() === 'false'){
          logger.info('Unparking: Purging');
          purgeArray.push('G92 E0');
          purgeArray.push('G1 Y2 E11 F300');
          purgeArray.push('G1 E10 F1800');
          purgeArray.push('G1 Y27 F3600');
        }
        that.mQueue.prependCommands(purgeArray);
        return true;
      },
    },
  ];
  return commandArray;
};


const getStatusCommands = function getStatusCommands(that) {
  let extruderTemp;
  let basePlateTemp;
  let status = new Status(that.getState());
  return [{
    code: 'M105',
    processData: (inCommand, inData) => {
      inData.replace(/(.):(\d+.\d+)/g, (inMatch, inLetter, inNumber) => {
        switch (inLetter) {
        case 'T': extruderTemp = inNumber; break;
        case 'B': basePlateTemp = inNumber; break;
        default: break;
        }
      });

      if (extruderTemp || basePlateTemp) {
        status.sensors = {};
      }
      if (extruderTemp !== undefined) {
        status.sensors.extruder1 = { 'temperature': extruderTemp };
      }
      if (basePlateTemp !== undefined) {
        status.sensors.basePlate = { 'temperature': basePlateTemp };
      }
      that.mStatusInProgress = status;

      return true;
    },
  }];
};

/**
 * validateReply()
 *
 * Confirms if a reply contains 'ok' as its last line.  Parses out DOS newlines.
 *
 * Args:   inReply - USB reply data
 * Return: true if the last line was 'ok'
 */
const validateReply = function validateReply(inCommand, inReply) {
  const lines = inReply.toString().split('\n');
  return (_.last(lines) === 'ok');
};

/**
 * expandCode()
 *
 * Expand simple commands to gcode we can send to the printer
 *
 * Args:   inCode - a simple string gcode command
 * Return: a gcode string suitable for the hardware
 */
const expandCode = function expandCode(inCode) {
  // Later add checksumming
  return inCode + '\n';
};

const setupExecutor = function setupExecutor(inDeviceData) {
  const openPrime = 'M501';
  return new SerialCommandExecutor(
    inDeviceData.comName,
    inDeviceData.baudrate,
    openPrime
  );
};

/****** END SERIAL API FUNCTIONS ******/

const escherPlayerConfig = {
  cancelCommands,
  completeCommands,
  pauseCommands,
  getStatusCommands,
  validateReply,
  expandCode,
  setupExecutor,
  parkCommands,
  unparkCommands,
  updateInterval: 1000,
};

/**
 * Our module export is a creation function that returns a Printrbot configured SerialPrinter
 */
const escherPlayer = (data) => {
  return new GcodeClient(data, escherPlayerConfig);
};

module.exports = escherPlayer;
