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

module.exports = function botTests() {
  describe('Bot unit test', function() {
    let job, botId;

    it('should create a virtual bot', async function (done) {
      try {
        const requestParams = {
          method: `POST`,
          uri: `http://localhost:9000/v1/bots/`,
          body: {
            model: `Virtual`,
            botId: `virtual-test-bot-${new Date().getTime()}`,
          },
          json: true,
        };
        const initializeBotReply = await request(requestParams);
        botId = initializeBotReply.data.settings.botId;
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
          uri: `http://localhost:9000/v1/bots/${botId}`,
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

    it('should fail to make a virtual bot if it conflicts with an existing botId', async function (done) {
      try {
        const requestParams = {
          method: `POST`,
          uri: `http://localhost:9000/v1/bots/`,
          body: {
            model: `Virtual`,
            botId,
          },
          json: true,
        };
        let initializeBotReply;
        try {
          initializeBotReply = await request(requestParams);
        } catch (ex) {
          initializeBotReply = ex;
        }
        should(initializeBotReply.error.status).equal(500);
        should(initializeBotReply.error.query).equal(`Create Bot`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should destroy the virtual bot', async function (done) {
      try {
        const requestParams = {
          method: `DELETE`,
          uri: `http://localhost:9000/v1/bots`,
          body: { botId },
          json: true,
        };
        const destroyBotReply = await request(requestParams);

        should(destroyBotReply.status).equal(200);
        should(destroyBotReply.query).equal(`Delete Bot`);
        should(destroyBotReply.data).equal(`Bot "${botId}" successfully deleted`);
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
            botId,
          },
          json: true,
        };
        const initializeBotReply = await request(requestParams);
        botId = initializeBotReply.data.settings.botId;
        should(initializeBotReply.status).equal(201);
        should(initializeBotReply.query).equal(`Create Bot`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should transition from detecting to ready, again', async function (done) {
      try {
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
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should connect', async function (done) {
      try {
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
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should finish connecting', async function (done) {
      try {
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
            botId,
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
        should(startJobReply.data.state).equal(`starting`);
        should(startJobReply.status).equal(200);
        should(startJobReply.query).equal(`Process Job Command`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should be running a job', async function (done) {
      try {
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
        should(jobPauseReply.data.state).equal(`pausing`);
        should(jobPauseReply.status).equal(200);
        should(jobPauseReply.query).equal(`Process Job Command`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should become paused', async function (done) {
      try {
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
        should(jobResumeReply.data.state).equal(`resuming`);
        should(jobResumeReply.status).equal(200);
        should(jobResumeReply.query).equal(`Process Job Command`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should become resumed', async function (done) {
      try {
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
        should(jobCancelReply.data.state).equal(`canceling`);
        should(jobCancelReply.status).equal(200);
        should(jobCancelReply.query).equal(`Process Job Command`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should become cancelled', async function (done) {
      try {
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
      } catch (ex) {
        logger.error(ex);
      }
    });

    it('should clean up by deleting the virtual bot', async function (done) {
      try {
        const requestParams = {
          method: `DELETE`,
          uri: `http://localhost:9000/v1/bots`,
          body: { botId },
          json: true,
        };
        const destroyBotReply = await request(requestParams);

        should(destroyBotReply.status).equal(200);
        should(destroyBotReply.query).equal(`Delete Bot`);
        should(destroyBotReply.data).equal(`Bot "${botId}" successfully deleted`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });
  });
};
