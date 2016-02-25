/* global describe, it */
const should = require(`should`);
const request = require(`request-promise`);
const fs = require(`fs-promise`);
const path = require(`path`);
const Promise = require(`bluebird`);
const config = require(`../../server/config`);

module.exports = function botTests() {
  describe('Bot unit test', function() {
    let job;

    it('should setup a job and a file', async function(done) {
      // Create a job
      const jobParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/`,
        json: true,
      };
      job = await request(jobParams);
      should(!!job.uuid);
      should(job.state).equal(`created`);

      // Upload a file
      const testFilePath = path.join(__dirname, `pause.gcode`);
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
        uri: `http://localhost:9000/v1/jobs/${job.uuid}/setFile`,
        body: { fileUuid: file.uuid },
        json: true,
      };
      console.log('about to make a request', setFileToJobParams);
      job = await request(setFileToJobParams);
      console.log('5', job);
      done();
    });

    it('should throw an error when issued a bogus command', async function(done) {
      should(false);
      done();
    });

    it('should initialize a virtual printer', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/bot/`,
        body: { command: `createVirtualBot` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`detecting`);
      done();
    });

    it('should transition from detecting to ready', async function (done) {
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/bot/`,
        json: true,
      };
      await Promise.delay(config.virtualDelay); // Wait for virtual "detecting" event to complete
      const res = await request(requestParams);
      should(res.state).equal(`ready`);
      done();
    });

    it('initializing a virtual printer should be idempotent', async function(done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/bot/`,
        body: { command: `createVirtualBot` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`ready`);
      done();
    });

    it('should destroy a virtual printer', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/bot/`,
        body: { command: `destroyVirtualBot` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`unavailable`);
      done();
    });

    it('destroying a virtual printer should be idempotent', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/bot/`,
        body: { command: `destroyVirtualBot` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`unavailable`);
      done();
    });

    it('should initialize a virtual printer, again', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/bot/`,
        body: { command: `createVirtualBot` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`detecting`);
      done();
    });

    it('should transition from detecting to ready, again', async function (done) {
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/bot/`,
        json: true,
      };
      await Promise.delay(config.virtualDelay); // Wait for virtual "detecting" event to complete
      const res = await request(requestParams);
      should(res.state).equal(`ready`);
      done();
    });

    it('should connect', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/bot/`,
        body: { command: `connect` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`connecting`);
      done();
    });

    it('should finish connecting', async function (done) {
      await Promise.delay(config.virtualDelay);
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/bot/`,
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`connected`);
      done();
    });

    it('should start a job', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        body: { command: `start` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`starting`);
      done();
    });

    it('should be running a job', async function (done) {
      await Promise.delay(config.virtualDelay); // wait for bot job to start
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`running`);
      done();
    });

    it('should pause a job', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        body: { command: `pause` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`pausing`);
      done();
    });

    it('should become paused', async function (done) {
      await Promise.delay(config.virtualDelay * 2); // Wait for bot to pause
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`paused`);
      done();
    });

    it('pause should be idempotent', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
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
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        body: { command: `resume` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`resuming`);
      done();
    });

    it('should become resumed', async function (done) {
      await Promise.delay(config.virtualDelay * 2); // Wait for bot to resume
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`running`);
      done();
    });

    it('resume should be idempotent', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        body: { command: `resume` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`running`);
      done();
    });

    it('should cancel a job', async function (done) {
      this.timeout(10000);
      await Promise.delay(5000);
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        body: { command: `cancel` },
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`canceling`);
      done();
    });

    it('should become cancelled', async function (done) {
      await Promise.delay(config.virtualDelay * 2); // Wait for bot to resume
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        json: true,
      };
      const res = await request(requestParams);
      should(res.state).equal(`canceled`);
      done();
    });
  });
};
