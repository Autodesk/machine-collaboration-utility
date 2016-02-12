/* global describe, it */
'use strict';
const supertest = require(`supertest`);
const path = require(`path`);
const walk = require(`fs-walk`);
const winston = require('winston');

const tests = [];
const config = require(`./dist/server/config`);

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
walk.walkSync('./dist/tests', (basedir, filename) => {
  if (filename === 'test.js') {
    const filepath = path.join(__dirname, basedir + '/' + filename);
    tests.push(require(filepath));
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
