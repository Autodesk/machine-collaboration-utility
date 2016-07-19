/* global describe, it */
const should = require(`should`);
const request = require(`request-promise`);
const fs = require(`fs-promise`);
const path = require(`path`);
const Promise = require(`bluebird`);
const winston = require('winston');
const config = require(`../../../config`);

// Setup logger
const filename = path.join(__dirname, `./${config.testLogFileName}`);
const logger = new (winston.Logger)({
  level: 'debug',
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename }),
  ],
});

module.exports = function botsTests() {
  describe('Bot unit test', function() {
    let job;
    let botUuid;

    it('should create a virtual bot', async function (done) {
      try {
        const requestParams = {
          method: `POST`,
          uri: `http://localhost:9000/v1/bots/`,
          body: {
            model: `Virtual`,
          },
          json: true,
        };
        const initializeBotReply = await request(requestParams);
        botUuid = initializeBotReply.data.settings.uuid;
        should(initializeBotReply.status).equal(201);
        should(initializeBotReply.query).equal(`Create Bot`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('the bot should have an initial state to ready', async function (done) {
      try {
        const requestParams = {
          method: `GET`,
          uri: `http://localhost:9000/v1/bots/${botUuid}`,
          json: true,
        };
        await Promise.delay(config.virtualDelay); // Wait for virtual "detecting" event to complete
        const getStatusReply = await request(requestParams);
        should(getStatusReply.data.state).equal(`ready`);
        should(getStatusReply.status).equal(200);
        should(getStatusReply.query).equal(`Get Bot`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should destroy the virtual bot', async function (done) {
      try {
        const requestParams = {
          method: `DELETE`,
          uri: `http://localhost:9000/v1/bots/${botUuid}`,
          json: true,
        };
        const destroyBotReply = await request(requestParams);

        should(destroyBotReply.status).equal(200);
        should(destroyBotReply.query).equal(`Delete Bot`);
        should(destroyBotReply.data).equal(`Bot "${botUuid}" successfully deleted`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should create a virtual bot, again', async function (done) {
      try {
        const requestParams = {
          method: `POST`,
          uri: `http://localhost:9000/v1/bots/`,
          body: {
            model: `Virtual`,
            botUuid,
          },
          json: true,
        };
        const initializeBotReply = await request(requestParams);
        botUuid = initializeBotReply.data.settings.uuid;
        should(initializeBotReply.status).equal(201);
        should(initializeBotReply.query).equal(`Create Bot`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should connect', async function (done) {
      await Promise.delay(config.virtualDelay); // Wait for virtual "detecting" event to complete
      try {
        const requestParams = {
          method: `POST`,
          uri: `http://localhost:9000/v1/bots/${botUuid}`,
          body: { command: `connect` },
          json: true,
        };
        const botCommandReply = await request(requestParams);
        should(botCommandReply.data.state).equal(`connecting`);
        should(botCommandReply.status).equal(200);
        should(botCommandReply.query).equal(`Process Bot Command`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should finish connecting', async function (done) {
      try {
        await Promise.delay(config.virtualDelay);
        const requestParams = {
          method: `GET`,
          uri: `http://localhost:9000/v1/bots/${botUuid}`,
          json: true,
        };
        const getStatusReply = await request(requestParams);
        should(getStatusReply.data.state).equal(`connected`);
        should(getStatusReply.status).equal(200);
        should(getStatusReply.query).equal(`Get Bot`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should setup a job and a file', async function(done) {
      try {
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

        // Create a job
        const jobParams = {
          method: `POST`,
          uri: `http://localhost:9000/v1/jobs/`,
          body: {
            botUuid,
            fileUuid: file.uuid,
          },
          json: true,
        };
        const createJobReply = await request(jobParams);
        // assign value to job
        job = createJobReply.data;
        should(!!job.uuid);
        should(job.state).equal(`ready`);
        should(createJobReply.status).equal(201);
        should(createJobReply.query).equal(`Create Job`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should start a job', async function (done) {
      try {
        const requestParams = {
          method: `POST`,
          uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
          body: { command: `start` },
          json: true,
        };
        const startJobReply = await request(requestParams);
        should(startJobReply.data.state).equal(`running`);
        should(startJobReply.status).equal(200);
        should(startJobReply.query).equal(`Process Job Command`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should pause a job', async function (done) {
      try {
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
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('pause should be idempotent', async function (done) {
      try {
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
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should resume a job', async function (done) {
      try {
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
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('resume should be idempotent', async function (done) {
      try {
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
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should cancel a job', async function (done) {
      try {
        this.timeout(10000);
        await Promise.delay(5000);
        const requestParams = {
          method: `POST`,
          uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
          body: { command: `cancel` },
          json: true,
        };
        const jobCancelReply = await request(requestParams);
        should(jobCancelReply.data.state).equal(`canceled`);
        should(jobCancelReply.status).equal(200);
        should(jobCancelReply.query).equal(`Process Job Command`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should clean up by deleting the virtual bot', async function (done) {
      try {
        const requestParams = {
          method: `DELETE`,
          uri: `http://localhost:9000/v1/bots/${botUuid}`,
          json: true,
        };
        const destroyBotReply = await request(requestParams);
        should(destroyBotReply.status).equal(200);
        should(destroyBotReply.query).equal(`Delete Bot`);
        should(destroyBotReply.data).equal(`Bot "${botUuid}" successfully deleted`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });
  });
};
