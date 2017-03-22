/* global describe, it */
const should = require('should');
const _ = require('underscore');
const request = require('request-promise');
const fs = require('fs-promise');
const path = require('path');
const Promise = require('bluebird');
const winston = require('winston');
const config = require('../../../config');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');

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

    it('the bot should have an initial state to ready', function (done) {
      const requestParams = {
        method: 'GET',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        json: true,
      };
      Promise.delay(config.virtualDelay) // Wait for virtual "detecting" event to complete
      .then(() => {
        request(requestParams)
        .then((getStatusReply) => {
          should(getStatusReply.data.state).equal('ready');
          should(getStatusReply.status).equal(200);
          should(getStatusReply.query).equal('Get Bot');
          done();
        })
        .catch((err) => {
          logger.error(err);
          done();
        });
      });
    });

    it('should destroy the virtual bot', function (done) {
      const requestParams = {
        method: 'DELETE',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        json: true,
      };
      request(requestParams)
      .then((destroyBotReply) => {
        should(destroyBotReply.status).equal(200);
        should(destroyBotReply.query).equal('Delete Bot');
        should(destroyBotReply.data).equal(`Bot "${botUuid}" successfully deleted`);
        done();
      })
      .catch((err) => {
        logger.error(err);
        done();
      });
    });

    it('should create a virtual bot, again', function (done) {
      const requestParams = {
        method: 'POST',
        uri: 'http://localhost:9000/v1/bots/',
        body: {
          model: 'Virtual',
          botUuid,
        },
        json: true,
      };

      request(requestParams)
      .then((initializeBotReply) => {
        botUuid = initializeBotReply.data.settings.uuid;
        should(initializeBotReply.status).equal(201);
        should(initializeBotReply.query).equal('Create Bot');
        done();
      })
      .catch((err) => {
        logger.error(err);
        done();
      });
    });

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

    it('should upload a file', function (done) {
      // Upload a file
      const testFilePath = path.join(__dirname, 'pause.gcode');
      const fileStream = fs.createReadStream(testFilePath);

      const formData = { file: fileStream };
      const fileParams = {
        method: 'POST',
        uri: 'http://localhost:9000/v1/files',
        formData,
        json: true,
      };
      request(fileParams)
      .then((uploadFileReply) => {
        should(uploadFileReply.status).equal(200);
        should(uploadFileReply.query).equal('Upload File');
        file = uploadFileReply.data[0];

        // Create a job
        const jobParams = {
          method: 'POST',
          uri: 'http://localhost:9000/v1/jobs/',
          body: {
            botUuid,
            fileUuid: file.uuid,
          },
          json: true,
        };
        request(jobParams)
        .then((createJobReply) => {
          // assign value to job
          job = createJobReply.data;
          should(!!job.uuid);
          should(job.state).equal('ready');
          should(createJobReply.status).equal(201);
          should(createJobReply.query).equal('Create Job');
          done();
        })
        .catch((err) => {
          logger.error(err);
          done();
        });
      })
      .catch((err) => {
        logger.error(err);
        done();
      });
    });

    it('should start a job', async function () {
      // Upload a file
      const testFilePath = path.join(__dirname, 'pause.gcode');
      const fileStream = fs.createReadStream(testFilePath);

      const formData = { file: fileStream };
      const fileParams = {
        method: 'POST',
        uri: 'http://localhost:9000/v1/files',
        formData,
        json: true,
      };
      const fileReply = await request(fileParams);
      const fileUuid = fileReply.data[0].uuid;

      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: {
          command: 'startJob',
          fileUuid,
        },
        json: true,
      };
      const startJobReply = await request(requestParams)
      .catch((err) => {
        logger.error(err);
      });

      should(startJobReply.data.state).equal('executingJob');
      should(startJobReply.status).equal(200);
      should(startJobReply.query).equal('Process Bot Command');
    });

    it('should pause a job', async function () {
      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: { command: 'pause' },
        json: true,
      };

      const pauseReply = await request(requestParams)
      .catch((err) => {
        logger.error(err);
      });

      should(pauseReply.data.state).equal('pausing');
      should(pauseReply.status).equal(200);
      should(pauseReply.query).equal('Process Bot Command');
    });

    it('should resume a job', async function () {
      this.timeout(10000);
      await Promise.delay(5000);

      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: { command: 'resume' },
        json: true,
      };

      const resumeReply = await request(requestParams)
      .catch((err) => {
        logger.error(err);
      });

      should(resumeReply.data.state).equal('resuming');
      should(resumeReply.status).equal(200);
      should(resumeReply.query).equal('Process Bot Command');
    });

    it('should cancel a job', async function () {
      this.timeout(10000);
      await Promise.delay(5000)

      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        body: { command: 'cancel' },
        json: true,
      };

      const cancelReply = await request(requestParams)
      .catch((err) => {
        logger.error(err);
      });

      console.log('cancelReply', cancelReply);

      should(cancelReply.data.state).equal('cancelingJob');
      should(cancelReply.status).equal(200);
      should(cancelReply.query).equal('Process Bot Command');
    });

    it('should clean up by deleting the file, virtual bot, and jobs', function (done) {
      // Delete the bot
      const deleteBotParams = {
        method: 'DELETE',
        uri: `http://localhost:9000/v1/bots/${botUuid}`,
        json: true,
      };
      request(deleteBotParams)
      .then((destroyBotReply) => {
        should(destroyBotReply.status).equal(200);
        should(destroyBotReply.query).equal('Delete Bot');
        should(destroyBotReply.data).equal(`Bot "${botUuid}" successfully deleted`);
      })
      .then(() => {
      // Delete the file
        const deleteFileParams = {
          method: 'DELETE',
          uri: 'http://localhost:9000/v1/files/',
          body: {
            uuid: file.uuid,
          },
          json: true,
        };
        request(deleteFileParams)
        /// TODO fix the cleanup of jobs
        .then(() => {
          // Delete the job
          const deleteJobParams = {
            method: 'DELETE',
            uri: 'http://localhost:9000/v1/jobs/',
            body: {
              uuid: job.uuid,
            },
            json: true,
          };
          request(deleteJobParams)
          .then((deleteJobReply) => {
            done();
          })
          .catch((err) => {
            logger.error(err);
            done();
          });
        });
      });
    });
  });

  describe('Conductor unit test', function () {
    let conductorUuid;
    let virtualBot1;
    let virtualBot2;
    let players;
    let initialBots;
    let jobUuid;

    it('should keep track of the bots initially available', function(done) {
      const requestParams = {
        method: 'GET',
        uri: 'http://localhost:9000/v1/bots/',
        json: true,
      };
      request(requestParams)
      .then((reply) => {
        initialBots = reply.data;
        done();
      });
    });

    it('should create a conductor bot', function (done) {
      const requestParams = {
        method: 'POST',
        uri: 'http://localhost:9000/v1/bots/',
        body: {
          model: 'Conductor',
        },
        json: true,
      };
      request(requestParams)
      .then((reply) => {
        conductorUuid = reply.data.settings.uuid;
        should(reply.status).equal(201);
        should(reply.query).equal('Create Bot');
        done();
      })
      .catch((err) => {
        logger.error(err);
        done();
      });
    });

    it('should create a virtual bot', function (done) {
      const requestParams = {
        method: 'POST',
        uri: 'http://localhost:9000/v1/bots/',
        body: {
          model: 'Virtual',
          name: 'bot1',
        },
        json: true,
      };
      request(requestParams)
      .then((reply) => {
        virtualBot1 = reply.data;
        should(reply.status).equal(201);
        should(reply.query).equal('Create Bot');
        done();
      })
      .catch((err) => {
        logger.error(err);
        done();
      });
    });

    it('should add a player to the conductor', function (done) {
      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: {
          command: 'addPlayer',
          name: virtualBot1.settings.name,
          endpoint: `http://localhost:9000/v1/bots/${virtualBot1.settings.uuid}`,
        },
        json: true,
      };
      request(requestParams)
      .then((reply) => {
        botUuid = reply.data.settings.uuid;
        players = reply.data.settings.custom.players;
        should(reply.status).equal(200);
        should(Array.isArray(players)).equal(true);
        should(players.length).equal(1);
        should(reply.query).equal('Process Bot Command');
        done();
      })
      .catch((err) => {
        logger.error(err);
        done();
      });
    });

    it('should not allow two players to have the same name', function (done) {
      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: {
          command: 'addPlayer',
          name: virtualBot1.settings.name,
          endpoint: `http://localhost:9000/v1/bots/${virtualBot1.settings.uuid}`,
        },
        json: true,
      };
      request(requestParams)
      .then((reply) => {
        should(reply.data.includes('Duplicate name')).equal(true);
        done();
      })
      .catch((err) => {
        logger.error(err);
        done();
      });
    });

    it('should add a second virtual bot', async function () {
      const reply = await request({
        method: 'POST',
        uri: 'http://localhost:9000/v1/bots/',
        body: {
          model: 'Virtual',
          name: 'bot2',
        },
        json: true,
      });
      virtualBot2 = reply.data;

      await request({
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: {
          command: 'addPlayer',
          name: virtualBot2.settings.name,
          endpoint: `http://localhost:9000/v1/bots/${virtualBot2.settings.uuid}`,
        },
        json: true,
      });
    });

    it('should create and connect all of the conductor\'s players', function (done) {
      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: {
          command: 'connect',
        },
        json: true,
      };
      request(requestParams)
      .then((reply) => {
        // Wait a second for the bots to connect
        Promise.delay(1000)
        .then(done);
      })
      .catch((err) => {
        logger.error(err);
        done();
      });
    });

    it('should verify that the players are connected and in an idle state', function (done) {
      let success = true;
      let nTimes = 0;
      Promise.map(players, (player) => {
        const requestParams = {
          method: 'GET',
          uri: player.endpoint,
          json: true,
        };
        return request(requestParams)
        .then((reply) => {
          if (reply.data.state !== 'idle') {
            success = false;
          }
          nTimes += 1;
        });
      })
      .then(() => {
        should(nTimes).equal(players.length);
        should(success).equal(true);
        done();
      });
    });

    it('should start printing a .esh file', async function() {
      this.timeout(10000);
      // Upload a file
      const testFilePath = path.join(__dirname, 'test-cubes.esh');
      const fileStream = fs.createReadStream(testFilePath);

      const formData = { file: fileStream };
      const fileParams = {
        method: 'POST',
        uri: 'http://localhost:9000/v1/files',
        formData,
        json: true,
      };
      const fileReply = await request(fileParams);
      const file = fileReply.data[0];

      // Kick off the job
      const startReply = await request({
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: {
          command: 'startJob',
          fileUuid: file.uuid,
        },
        json: true,
      })
      .catch(err => {
        console.log('start printing .esh error', err);
      });

      console.log('start reply', startReply);
      jobUuid = startReply.data.currentJob.uuid;

      should(startReply.data.state).equal('executingJob');
      should(startReply.status).equal(200);
      should(startReply.query).equal('Process Bot Command');
    });

    it('should pause printing a .esh file', async function() {
      this.timeout(20000);
      await Promise.delay(10000);


      const pauseReply = await request({
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: { command: 'pause' },
        json: true,
      })
      .catch(err => {
        console.log('pause printing .esh error', err);
      });

      should(pauseReply.data.state).equal('paused');
      should(pauseReply.status).equal(200);
      should(pauseReply.query).equal('Process Bot Command');
    });

    it('should resume printing a .esh file', async function() {
      this.timeout(20000);
      await Promise.delay(10000);

      const resumeReply = await request({
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: { command: 'resume' },
        json: true,
      })
      .catch(err => {
        console.log('resume printing .esh error', err);
      });

      should(resumeReply.data.state).equal('executingJob');
      should(resumeReply.status).equal(200);
      should(resumeReply.query).equal('Process Bot Command');
    });

    it('should complete printing a .esh file', async function() {
      this.timeout(60000);
      await Promise.delay(50000);

      const getJobReply = await request({
        method: 'GET',
        uri: `http://localhost:9000/v1/jobs/${jobUuid}`,
        json: true,
      });

      should(getJobReply.data.state).equal('complete');
      should(getJobReply.data.percentComplete).equal(100);
      should(getJobReply.status).equal(200);
      should(getJobReply.data.botUuid).equal(conductorUuid);
    });

    it('should start printing another .esh file', async function() {
      should(true).equal(false);
    });

    it('should cancel printing a .esh file', async function() {
      should(true).equal(false);
    });

    it('should disconnect the conductor', async function() {
      should(true).equal(false);
    });

    it('should remove a player from the conductor', function (done) {
      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: {
          command: 'removePlayer',
          name: virtualBot1.settings.name,
        },
        json: true,
      };
      request(requestParams)
      .then((reply) => {
        const replyPlayers = reply.data.settings.custom.players;
        should(reply.status).equal(200);
        should(Array.isArray(players)).equal(true);
        should(replyPlayers.length).equal(players.length - 1);
        should(reply.query).equal('Process Bot Command');
        done();
      })
      .catch((err) => {
        logger.error(err);
        done();
      });
    });

    it('should clean up by removing all of the bots that were added', function (done) {
      const requestParams = {
        method: 'GET',
        uri: 'http://localhost:9000/v1/bots/',
        json: true,
      };
      request(requestParams)
      .then((reply) => {
        const finalBots = reply.data;
        const botRemovalPromises = [];
        for (const [botKey, bot] of _.pairs(finalBots)) {
          // If the bot can't be found in the initial list of bots
          // Then delete the bot
          if (initialBots[botKey] === undefined) {
            const botPromise = new Promise((resolve, reject) => {
              const deleteBotParams = {
                method: 'DELETE',
                uri: `http://localhost:9000/v1/bots/${botKey}`,
                json: true,
              };

              request(deleteBotParams)
              .then(() => {
                resolve();
              })
              .catch(() => {
                reject();
              });
            });

            botRemovalPromises.push(botPromise);
          }
        }

        Promise.all(botRemovalPromises)
        .then(() => {
          done();
        });
      });
    });
  });
};
