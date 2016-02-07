/* global describe, it */
const should = require(`should`);
const request = require(`request-promise`);
const fs = require(`fs-promise`);
const path = require(`path`);
const Promise = require(`bluebird`);

module.exports = function toDoListTests() {
  describe('Gcode Client unit test', function() {
    let job;

    it('should setup a job and a file', async function(done) {
      // Create a job
      const jobParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/`,
        json: true,
      };
      job = await request(jobParams);
      should(!!job.id);
      should(job.state).equal(`created`);

      // Upload a file
      const testFilePath = path.join(__dirname, `wait.gcode`);
      const fileStream = await fs.createReadStream(testFilePath);
      const formData = { file: fileStream };
      const fileParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/files`,
        formData,
      };
      const uploadReply = await request(fileParams);
      const file = JSON.parse(uploadReply)[0];

      // Assign a file to a job
      const setFileToJobParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.id}/setFile`,
        body: { fileId: file.id },
        json: true,
      };
      job = await request(setFileToJobParams);

      done();
    });

    it('should throw an error when issued a bogus command', async function(done) {
      should(false);
      done();
    });

    it('should initialize a virtual printer', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/client/`,
        body: { command: `createVirtualClient` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`ready`);
      done();
    });

    it('initializing a virtual printer should be idempotent', async function(done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/client/`,
        body: { command: `createVirtualClient` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`ready`);
      done();
    });

    it('should destroy a virtual printer', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/client/`,
        body: { command: `destroyVirtualClient` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`unavailable`);
      done();
    });

    it('destroying a virtual printer should be idempotent', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/client/`,
        body: { command: `destroyVirtualClient` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`unavailable`);
      done();
    });

    it('should initialize a virtual printer, again', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/client/`,
        body: { command: `createVirtualClient` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`ready`);
      done();
    });

    it('should connect', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/client/`,
        body: { command: `connect` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`connected`);
      done();
    });

    it('should start a job', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.id}`,
        body: { command: `start` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`running`);
      done();
    });

    it('should pause a job', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.id}`,
        body: { command: `pause` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`paused`);
      done();
    });

    it('pause should be idempotent', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.id}`,
        body: { command: `pause` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`paused`);
      done();
    });

    it('should resume a job', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.id}`,
        body: { command: `resume` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`running`);
      done();
    });

    it('resume should be idempotent', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.id}`,
        body: { command: `resume` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`running`);
      done();
    });
  });
};
