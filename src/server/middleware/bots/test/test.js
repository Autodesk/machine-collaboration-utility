/* global describe, it */
const should = require(`should`);
const request = require(`request-promise`);
const fs = require(`fs-promise`);
const path = require(`path`);
const Promise = require(`bluebird`);
const config = require(`../../../config`);

module.exports = function botTests() {
  describe('Bot unit test', function() {
    let job, botId;

    it('should create a virtual bot', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/bots/`,
        body: {
          model: `Virtual`,
          botId: `virtual-test-bot`,
        },
        json: true,
      };
      const initializeBotReply = await request(requestParams);
      botId = initializeBotReply.data.settings.botId;
      should(initializeBotReply.status).equal(201);
      should(initializeBotReply.query).equal(`Create Bot`);
      done();
    });

    it('the bot should have an initial state to ready', async function (done) {
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/bots/${botId}`,
        json: true,
      };
      await Promise.delay(config.virtualDelay); // Wait for virtual "detecting" event to complete
      const getStatusReply = await request(requestParams);
      should(getStatusReply.data.state).equal(`ready`);
      should(getStatusReply.status).equal(200);
      should(getStatusReply.query).equal(`Get Bot`);
      done();
    });

    it('should fail to make a virtual bot if it conflicts with an existing botId', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/bots/`,
        body: {
          model: `Virtual`,
          botId: `virtual-test-bot`,
        },
        json: true,
      };
      let initializeBotReply;
      try {
        initializeBotReply = await request(requestParams);
      } catch(ex) {
        initializeBotReply = ex;
      }

      should(initializeBotReply.error.status).equal(500);
      should(initializeBotReply.error.query).equal(`Create Bot`);
      done();
    });

    it('should destroy the virtual bot', async function (done) {
      const requestParams = {
        method: `DELETE`,
        uri: `http://localhost:9000/v1/bots`,
        body: { botId },
        json: true,
      };
      const destroyBotReply = await request(requestParams);
      console.log('destroyBotReply', destroyBotReply);

      should(destroyBotReply.status).equal(200);
      should(destroyBotReply.query).equal(`Delete Bot`);
      should(destroyBotReply.data).equal(`Bot "virtual-test-bot" successfully deleted`);
      done();
    });

    it('should create a virtual bot, again', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/bots/`,
        body: {
          model: `Virtual`,
          botId: `virtual-test-bot`,
        },
        json: true,
      };
      const initializeBotReply = await request(requestParams);
      botId = initializeBotReply.data.settings.botId;
      should(initializeBotReply.status).equal(201);
      should(initializeBotReply.query).equal(`Create Bot`);
      done();
    });

    it('should transition from detecting to ready, again', async function (done) {
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/bots/${botId}`,
        json: true,
      };
      await Promise.delay(config.virtualDelay); // Wait for virtual "detecting" event to complete
      const getStatusReply = await request(requestParams);
      should(getStatusReply.data.state).equal(`ready`);
      should(getStatusReply.status).equal(200);
      should(getStatusReply.query).equal(`Get Bot`);
      done();
    });

    it('should connect', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/bots/${botId}`,
        body: { command: `connect` },
        json: true,
      };
      const botCommandReply = await request(requestParams);
      should(botCommandReply.data.state).equal(`connecting`);
      should(botCommandReply.status).equal(200);
      should(botCommandReply.query).equal(`Process Bot Command`);
      done();
    });

    it('should finish connecting', async function (done) {
      await Promise.delay(config.virtualDelay);
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/bots/${botId}`,
        json: true,
      };
      const getStatusReply = await request(requestParams);
      should(getStatusReply.data.state).equal(`connected`);
      should(getStatusReply.status).equal(200);
      should(getStatusReply.query).equal(`Get Bot`);
      done();
    });

    it('should setup a job and a file', async function(done) {
      // Create a job
      const jobParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/`,
        body: { botId },
        json: true,
      };
      const createJobReply = await request(jobParams);
      // assign value to job
      job = createJobReply.data;
      should(!!job.uuid);
      should(job.state).equal(`created`);
      should(createJobReply.status).equal(201);
      should(createJobReply.query).equal(`Create Job`);

      // Upload a file
      const testFilePath = path.join(__dirname, `pause.gcode`);
      const fileStream = await fs.createReadStream(testFilePath);
      const formData = { file: fileStream };
      const fileParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/files`,
        formData,
        json: true,
      };
      const uploadFileReply = await request(fileParams);
      should(uploadFileReply.status).equal(200);
      should(uploadFileReply.query).equal(`Upload File`);
      const file = uploadFileReply.data[0];

      // Assign a file to a job
      const setFileToJobParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}/setFile`,
        body: { fileUuid: file.uuid },
        json: true,
      };
      try {
        const setFileToJobReply = await request(setFileToJobParams);
        job = setFileToJobReply.data;
        should(setFileToJobReply.status).equal(200);
        should(setFileToJobReply.query).equal(`Set File to Job`);
        done();
      } catch (ex) {
        console.log('flailboat', ex);
      }
    });

    it('should start a job', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        body: { command: `start` },
        json: true,
      };
      const startJobReply = await request(requestParams);
      should(startJobReply.data.state).equal(`starting`);
      should(startJobReply.status).equal(200);
      should(startJobReply.query).equal(`Process Job Command`);
      done();
    });

    it('should be running a job', async function (done) {
      await Promise.delay(config.virtualDelay); // wait for bot job to start
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        json: true,
      };
      const getStatusReply = await request(requestParams);
      should(getStatusReply.data.state).equal(`running`);
      should(getStatusReply.status).equal(200);
      should(getStatusReply.query).equal(`Get Job`);
      done();
    });

    it('should pause a job', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        body: { command: `pause` },
        json: true,
      };
      const jobPauseReply = await request(requestParams);
      should(jobPauseReply.data.state).equal(`pausing`);
      should(jobPauseReply.status).equal(200);
      should(jobPauseReply.query).equal(`Process Job Command`);
      done();
    });

    it('should become paused', async function (done) {
      await Promise.delay(config.virtualDelay * 2); // Wait for bot to pause
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        json: true,
      };
      const getStatusReply = await request(requestParams);
      should(getStatusReply.data.state).equal(`paused`);
      should(getStatusReply.status).equal(200);
      should(getStatusReply.query).equal(`Get Job`);
      done();
    });

    it('pause should be idempotent', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        body: { command: `pause` },
        json: true,
      };
      const jobPauseReply = await request(requestParams);
      should(jobPauseReply.data.state).equal(`paused`);
      should(jobPauseReply.status).equal(200);
      should(jobPauseReply.query).equal(`Process Job Command`);
      done();
    });

    it('should resume a job', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        body: { command: `resume` },
        json: true,
      };
      const jobResumeReply = await request(requestParams);
      should(jobResumeReply.data.state).equal(`resuming`);
      should(jobResumeReply.status).equal(200);
      should(jobResumeReply.query).equal(`Process Job Command`);
      done();
    });

    it('should become resumed', async function (done) {
      await Promise.delay(config.virtualDelay * 2); // Wait for bot to resume
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        json: true,
      };
      const getStatusReply = await request(requestParams);
      should(getStatusReply.data.state).equal(`running`);
      should(getStatusReply.status).equal(200);
      should(getStatusReply.query).equal(`Get Job`);
      done();
    });

    it('resume should be idempotent', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        body: { command: `resume` },
        json: true,
      };
      const jobResumeReply = await request(requestParams);
      should(jobResumeReply.data.state).equal(`running`);
      should(jobResumeReply.status).equal(200);
      should(jobResumeReply.query).equal(`Process Job Command`);
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
      const jobCancelReply = await request(requestParams);
      should(jobCancelReply.data.state).equal(`canceling`);
      should(jobCancelReply.status).equal(200);
      should(jobCancelReply.query).equal(`Process Job Command`);
      done();
    });

    it('should become cancelled', async function (done) {
      await Promise.delay(config.virtualDelay * 2); // Wait for bot to resume
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        json: true,
      };
      const getStatusReply = await request(requestParams);
      should(getStatusReply.data.state).equal(`canceled`);
      should(getStatusReply.status).equal(200);
      should(getStatusReply.query).equal(`Get Job`);
      done();
    });

    it('should clean up by deleting the virtual bot', async function (done) {
      const requestParams = {
        method: `DELETE`,
        uri: `http://localhost:9000/v1/bots`,
        body: { botId },
        json: true,
      };
      const destroyBotReply = await request(requestParams);
      console.log('destroyBotReply', destroyBotReply);

      should(destroyBotReply.status).equal(200);
      should(destroyBotReply.query).equal(`Delete Bot`);
      should(destroyBotReply.data).equal(`Bot "virtual-test-bot" successfully deleted`);
      done();
    });
  });
};
