/* global describe, it */
const should = require('should');
const request = require('request-promise');
const fs = require('fs-promise');
const path = require('path');
const winston = require('winston');
const config = require('../../../server/config');

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
  describe('Bot unit test', function () {
    let job;
    let botUuid;
    let file;
    let blockFile;

    it('should create a virtual bot', function (done) {
      const requestParams = {
        method: 'POST',
        uri: 'http://localhost:9000/v1/bots/',
        body: {
          model: 'Virtual',
        },
        json: true,
      };
      request(requestParams)
      .then((reply) => {
        botUuid = reply.data.settings.uuid;
        should(reply.status).equal(201);
        should(reply.query).equal('Create Bot');
        done();
      })
      .catch((err) => {
        logger.error(err);
        done();
      });
    });

    // it('the bot should have an initial state to ready', function (done) {
    //   const requestParams = {
    //     method: 'GET',
    //     uri: `http://localhost:9000/v1/bots/${botUuid}`,
    //     json: true,
    //   };
    //   Promise.delay(config.virtualDelay) // Wait for virtual "detecting" event to complete
    //   .then(() => {
    //     request(requestParams)
    //     .then((getStatusReply) => {
    //       should(getStatusReply.data.state).equal('ready');
    //       should(getStatusReply.status).equal(200);
    //       should(getStatusReply.query).equal('Get Bot');
    //       done();
    //     })
    //     .catch((err) => {
    //       logger.error(err);
    //       done();
    //     });
    //   });
    // });

    // it('should destroy the virtual bot', function (done) {
    //   const requestParams = {
    //     method: 'DELETE',
    //     uri: `http://localhost:9000/v1/bots/${botUuid}`,
    //     json: true,
    //   };
    //   request(requestParams)
    //   .then((destroyBotReply) => {
    //     should(destroyBotReply.status).equal(200);
    //     should(destroyBotReply.query).equal('Delete Bot');
    //     should(destroyBotReply.data).equal(`Bot "${botUuid}" successfully deleted`);
    //     done();
    //   })
    //   .catch((err) => {
    //     logger.error(err);
    //     done();
    //   });
    // });

    // it('should create a virtual bot, again', function (done) {
    //   const requestParams = {
    //     method: 'POST',
    //     uri: 'http://localhost:9000/v1/bots/',
    //     body: {
    //       model: 'Virtual',
    //       botUuid,
    //     },
    //     json: true,
    //   };

    //   request(requestParams)
    //   .then((initializeBotReply) => {
    //     botUuid = initializeBotReply.data.settings.uuid;
    //     should(initializeBotReply.status).equal(201);
    //     should(initializeBotReply.query).equal('Create Bot');
    //     done();
    //   })
    //   .catch((err) => {
    //     logger.error(err);
    //     done();
    //   });
    // });

    it('should connect', function (done) {
      Promise.delay(config.virtualDelay) // Wait for virtual "detecting" event to complete
      .then(() => {
        const requestParams = {
          method: 'POST',
          uri: `http://localhost:9000/v1/bots/${botUuid}`,
          body: { command: 'connect' },
          json: true,
        };
        request(requestParams)
        .then((botCommandReply) => {
          should(botCommandReply.data.state).equal('connecting');
          should(botCommandReply.status).equal(200);
          should(botCommandReply.query).equal('Process Bot Command');
          done();
        })
        .catch((err) => {
          logger.error(err);
          done();
        });
      });
    });

    it('should finish connecting and transition to a state of "idle"', function (done) {
      Promise.delay(config.virtualDelay)
      .then(() => {
        const requestParams = {
          method: 'GET',
          uri: `http://localhost:9000/v1/bots/${botUuid}`,
          json: true,
        };
        request(requestParams)
        .then((getStatusReply) => {
          should(getStatusReply.data.state).equal('idle');
          should(getStatusReply.status).equal(200);
          should(getStatusReply.query).equal('Get Bot');
          done();
        });
      });
    });

    // it('should upload a file', function (done) {
    //   // Upload a file
    //   const testFilePath = path.join(__dirname, 'pause.gcode');
    //   const fileStream = fs.createReadStream(testFilePath);

    //   const formData = { file: fileStream };
    //   const fileParams = {
    //     method: 'POST',
    //     uri: 'http://localhost:9000/v1/files',
    //     formData,
    //     json: true,
    //   };
    //   request(fileParams)
    //   .then((uploadFileReply) => {
    //     should(uploadFileReply.status).equal(200);
    //     should(uploadFileReply.query).equal('Upload File');
    //     file = uploadFileReply.data[0];

    //     // Create a job
    //     const jobParams = {
    //       method: 'POST',
    //       uri: 'http://localhost:9000/v1/jobs/',
    //       body: {
    //         botUuid,
    //         fileUuid: file.uuid,
    //       },
    //       json: true,
    //     };
    //     request(jobParams)
    //     .then((createJobReply) => {
    //       // assign value to job
    //       job = createJobReply.data;
    //       should(!!job.uuid);
    //       should(job.state).equal('ready');
    //       should(createJobReply.status).equal(201);
    //       should(createJobReply.query).equal('Create Job');
    //       done();
    //     })
    //     .catch((err) => {
    //       logger.error(err);
    //       done();
    //     });
    //   })
    //   .catch((err) => {
    //     logger.error(err);
    //     done();
    //   });
    // });

    // it('should start a job', async function () {
    //   // Upload a file
    //   const testFilePath = path.join(__dirname, 'pause.gcode');
    //   const fileStream = fs.createReadStream(testFilePath);

    //   const formData = { file: fileStream };
    //   const fileParams = {
    //     method: 'POST',
    //     uri: 'http://localhost:9000/v1/files',
    //     formData,
    //     json: true,
    //   };
    //   const fileReply = await request(fileParams);
    //   const fileUuid = fileReply.data[0].uuid;

    //   const requestParams = {
    //     method: 'POST',
    //     uri: `http://localhost:9000/v1/bots/${botUuid}`,
    //     body: {
    //       command: 'startJob',
    //       fileUuid,
    //     },
    //     json: true,
    //   };
    //   const startJobReply = await request(requestParams)
    //   .catch((err) => {
    //     logger.error(err);
    //   });

    //   should(startJobReply.data.state).equal('executingJob');
    //   should(startJobReply.status).equal(200);
    //   should(startJobReply.query).equal('Process Bot Command');
    // });

    // it('should pause a job', async function () {
    //   const requestParams = {
    //     method: 'POST',
    //     uri: `http://localhost:9000/v1/bots/${botUuid}`,
    //     body: { command: 'pause' },
    //     json: true,
    //   };

    //   const pauseReply = await request(requestParams)
    //   .catch((err) => {
    //     logger.error(err);
    //   });

    //   should(pauseReply.data.state).equal('pausing');
    //   should(pauseReply.status).equal(200);
    //   should(pauseReply.query).equal('Process Bot Command');
    // });

    // it('should resume a job', async function () {
    //   this.timeout(10000);
    //   await Promise.delay(5000);

    //   const requestParams = {
    //     method: 'POST',
    //     uri: `http://localhost:9000/v1/bots/${botUuid}`,
    //     body: { command: 'resume' },
    //     json: true,
    //   };

    //   const resumeReply = await request(requestParams)
    //   .catch((err) => {
    //     logger.error(err);
    //   });

    //   should(resumeReply.data.state).equal('resuming');
    //   should(resumeReply.status).equal(200);
    //   should(resumeReply.query).equal('Process Bot Command');
    // });

    // it('should cancel a job', async function () {
    //   this.timeout(10000);
    //   await Promise.delay(5000);

    //   const requestParams = {
    //     method: 'POST',
    //     uri: `http://localhost:9000/v1/bots/${botUuid}`,
    //     body: { command: 'cancel' },
    //     json: true,
    //   };

    //   const cancelReply = await request(requestParams)
    //   .catch((err) => {
    //     logger.error(err);
    //   });

    //   should(cancelReply.data.state).equal('cancelingJob');
    //   should(cancelReply.status).equal(200);
    //   should(cancelReply.query).equal('Process Bot Command');
    // });

    // it('should be in a state of idle after being canceled', async function() {
    //   this.timeout(3000);
    //   await Promise.delay(2000);

    //   const requestParams = {
    //     method: 'GET',
    //     uri: `http://localhost:9000/v1/bots/${botUuid}`,
    //     json: true,
    //   };

    //   const getReply = await request(requestParams)
    //   .catch((err) => {
    //     logger.error(err);
    //   });

    //   should(getReply.data.state).equal('idle');
    //   should(getReply.status).equal(200);
    // });

// BEGIN WARNING TESTS
    it('should error if you pass no warning arguments', async function() {
      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'warn',
        },
        json: true,
      };

      await request(requestParams)
      .catch((err) => {
        should(err.error.error.message).equal('Error: Warn param "warning" is not defined');
      });
    });

    it('should error if you issue an unsupported warning', async function() {
      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'warn',
          warning: 'BogusWarning',
        },
        json: true,
      };

      await request(requestParams)
      .catch((err) => {
        should(err.error.error.message).equal('Error: Warning "BogusWarning" is not supported');
      });
    });

    it('should collect a warning from an "idle" state', async function() {
      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'warn',
          warning: 'genericWarning',
        },
        json: true,
      };

      const warnReply = await request(requestParams);
      const warnings = warnReply.data.warnings;
      should.ok(Array.isArray(warnings));
      should.ok(warnings.length === 1);
      should(warnings[0].type).equal('genericWarning');
    });

    it('issuing a warning should be idempotent', async function() {
      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'warn',
          warning: 'genericWarning',
        },
        json: true,
      };

      const warnReply = await request(requestParams);
      const warnings = warnReply.data.warnings;
      should.ok(Array.isArray(warnings));
      should.ok(warnings.length === 1);
      should(warnings[0].type).equal('genericWarning');
    });

    it('should not be able to start a job when it has un-resolved warnings', async function() {
      const pauseAndBlockFile = path.join(__dirname, 'pause_and_block.gcode');
      const fileStream = fs.createReadStream(pauseAndBlockFile);

      const formData = { file: fileStream };
      const fileParams = {
        method: 'POST',
        uri: 'http://localhost:9000/v1/files',
        formData,
        json: true,
      };

      const uploadFileReply = await request(fileParams);
      blockFile = uploadFileReply.data[0];

      const startJobParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'startJob',
          fileUuid: blockFile.uuid,
        },
        json: true,
      };

      await request(startJobParams)
      .catch((err) => {
        should(err.error.error.message).equal('Error: Cannot start job with unresolved warnings');
      });
    });

    it('should be able to resolve a warning', async function() {
      const resolveWarningRequest = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'resolveWarning',
          warning: 'genericWarning',
        },
        json: true,
      };

      const resolveWarningReply = await request(resolveWarningRequest)
      should.ok(resolveWarningReply.data.warnings.length === 0);
    });

    it('should start another print', async function() {
      const startJobParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'startJob',
          fileUuid: blockFile.uuid,
        },
        json: true,
      };

      await request(startJobParams);
    });

    it('should receive a warning mid-print', async function() {
      this.timeout(2000);
      await Promise.delay(1000);
      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'warn',
          warning: 'genericWarning',
        },
        json: true,
      };

      const warnReply = await request(requestParams);
      const warnings = warnReply.data.warnings;
      should.ok(Array.isArray(warnings));
      should.ok(warnings.length === 1);
      should(warnings[0].type).equal('genericWarning');
    });

    it('should not be able to resume a job when it has un-resolved warnings', async function() {
      this.timeout(6000);
      await Promise.delay(4000);

      const resumeParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'resume',
        },
        json: true,
      };

      await request(resumeParams)
      .catch((err) => {
        should(err.error.error.message).equal('Error: Cannot resume bot Virtual Bot with unresolved warnings');
      });
    });

    it('should resolve a mid-print warning', async function() {
      const resolveWarningRequest = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'resolveWarning',
          warning: 'genericWarning',
        },
        json: true,
      };

      const resolveWarningReply = await request(resolveWarningRequest);
      should.ok(resolveWarningReply.data.warnings.length === 0);
      should(resolveWarningReply.data.state).equal('resuming');
    });

    it('should pause and then issue a warning from the state "pausing"', async function() {
      this.timeout(10000);
      await Promise.delay(1500);

      const pauseParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'pause',
        },
        json: true,
      };

      await request(pauseParams);
      await Promise.delay(500);

      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'warn',
          warning: 'genericWarning',
        },
        json: true,
      };

      await request(requestParams);
      // Wait for pause to finish
      await Promise.delay(4500);

      const getBotParams = {
        method: 'GET',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        json: true,
      };

      const getReply = await request(getBotParams);
      const warnings = getReply.data.warnings;

      should.ok(Array.isArray(warnings));
      should.ok(warnings.length === 1);
      should(warnings[0].type).equal('genericWarning');
    });

    it('should resolve a warning issued from "pausing"', async function() {
      const resolveWarningRequest = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'resolveWarning',
          warning: 'genericWarning',
        },
        json: true,
      };

      const resolveWarningReply = await request(resolveWarningRequest);
      should.ok(resolveWarningReply.data.warnings.length === 0);
      should(resolveWarningReply.data.state).equal('paused');
    });

    it('should issue a warning from the state "paused"', async function() {
      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'warn',
          warning: 'genericWarning',
        },
        json: true,
      };

      const warnReply = await request(requestParams);
      console.log('warn reply', warnReply);
      const warnings = warnReply.data.warnings;
      should.ok(Array.isArray(warnings));
      should.ok(warnings.length === 1);
      should(warnings[0].type).equal('genericWarning');
    });

    // it('should not be able to resume until all warnings are resolved', async function() {
    //   should.equal(false, true);
    // });

    // it('shouold resolve a warning issued from "paused"', async function() {
    //   should.equal(false, true);
    // });

    // it('should resume and then issue a warning from the state "resuming"', async function() {
    //   should.equal(false, true);
    // });

    // it('should resolve a warning issued from "resuming"', async function() {
    //   should.equal(false, true);
    // });

    // it('should issue a warning from the state "blocked"', async function() {
    //   should.equal(false, true);
    // });

    // it('should resolve a warning issued from "blocked"', async function() {
    //   should.equal(false, true);
    // });

    // it('should clean up by deleting the file, virtual bot, and jobs', async function (done) {
    //   // Delete the bot
    //   const deleteBotParams = {
    //     method: 'DELETE',
    //     uri: `http://localhost:9000/v1/bots/${botUuid}`,
    //     json: true,
    //   };

    //   const destroyBotReply = await request(deleteBotParams);
    //   should(destroyBotReply.status).equal(200);
    //   should(destroyBotReply.query).equal('Delete Bot');
    //   should(destroyBotReply.data).equal(`Bot "${botUuid}" successfully deleted`);


    //   // Delete the file
    //   const deleteFileParams = {
    //     method: 'DELETE',
    //     uri: 'http://localhost:9000/v1/files/',
    //     body: {
    //       uuid: file.uuid,
    //     },
    //     json: true,
    //   };

    //   await request(deleteFileParams);

    //   // Delete the job
    //   const deleteJobParams = {
    //     method: 'DELETE',
    //     uri: 'http://localhost:9000/v1/jobs/',
    //     body: {
    //       uuid: job.uuid,
    //     },
    //     json: true,
    //   };

    //   await request(deleteJobParams);
    // });
  });
};
