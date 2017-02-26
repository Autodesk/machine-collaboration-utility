/* global describe, it */
require('source-map-support').install();
'use strict';

/*******************************************************************************
 * This framework allows for each piece of middleware to run its own tests
 * The individual pieces of middleware will place their tests in the following location:
 * src/middleware/<your middleware>/test/test.js
 * To run tests use 'npm test'
 * If you want to run an individual test, use npm test --yourtest
 ******************************************************************************/

const path = require('path');
const walk = require('fs-walk');
const winston = require('winston');

const config = require('./server/config');
const npmArgs = JSON.parse(process.env.npm_config_argv);

const tests = [];

// Setup logger
const filename = path.join(__dirname, `./${config.testLogFileName}`);
const logger = new (winston.Logger)({
  level: 'debug',
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename }),
  ],
});
logger.info(`Test initialized.`);

// Collect the test file from each middleware module
walk.walkSync('./server', (basedir, filename) => {

  const testArg = npmArgs.cooked[1] && npmArgs.cooked[1].split('--')[1].toLowerCase();

  const basedirArray = basedir.split('/');
  if (filename === 'test.js') {
    if (
      // If no test variable is passed
      npmArgs.cooked.length <= 1
      ||
      // or the test variable matches the current directory
      testArg === basedirArray[basedirArray.length - 2].toLowerCase()
    ) {
      // add the test to our test array
      const filepath = path.join(__dirname, `${basedir}/${filename}`);
      tests.push(require(filepath));
    }
  }
});

// Run each middleware test
describe('Server Tests', function middlewareTest() {
  this.timeout(config.virtualDelay * 4);
  for (let i = 0; i < tests.length; i++) {
    try {
      tests[i]();
    } catch (ex) {
      logger.error(ex);
    }
  }
});
