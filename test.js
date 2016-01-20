/* global describe, it */
'use strict';
const supertest = require(`supertest`);
const path = require(`path`);
const walk = require('fs-walk');

const location = `http://localhost:` + process.env.PORT;
const server = supertest.agent(location);
const tests = [];

// Collect the test file from each middleware module
walk.walkSync('./src/middleware', (basedir, filename) => {
  if (filename === 'test.js') {
    const filepath = path.join(__dirname, basedir + '/' + filename);
    tests.push(require(filepath));
  }
});

// Run each middleware test
describe('Server Tests', function middlewareTest() {
  for (let i = 0; i < tests.length; i++) {
    tests[i](server);
  }
});
