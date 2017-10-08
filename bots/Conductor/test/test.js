/* global describe, it */
const should = require('should');
const _ = require('lodash');
const request = require('request-promise');
const fs = require('fs-promise');
const path = require('path');
const winston = require('winston');
const bluebird = require('bluebird');
const config = require('../../../server/config');
// Setup logger
const filename = path.join(__dirname, `./${config.testLogFileName}`);
const logger = new winston.Logger({
  level: 'debug',
  transports: [new winston.transports.Console(), new winston.transports.File({ filename })],
});

module.exports = function botsTests() {
  describe('Conductor unit test', () => {
    let fileUuid;
    let conductorUuid;
    let virtualBot1;
    let virtualBot2;
    let players;
    let initialBots;
    let jobUuid;

    it('should keep track of the bots initially available', (done) => {
      const requestParams = {
        method: 'GET',
        uri: 'http://localhost:9000/v1/bots/',
        json: true,
      };
      request(requestParams).then((reply) => {
        initialBots = reply.data;
        done();
      });
    });

    it('should create a conductor bot', (done) => {
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

    it('should create a virtual bot', (done) => {
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

    it('should add a player to the conductor', (done) => {
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

    it('should not allow two players to have the same name', (done) => {
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

    it('should add a second virtual bot', async () => {
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

      const addSecondPlayerReply = await request({
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: {
          command: 'addPlayer',
          name: virtualBot2.settings.name,
          endpoint: `http://localhost:9000/v1/bots/${virtualBot2.settings.uuid}`,
        },
        json: true,
      });

      // Update the "players" variable when you add another player
      players = addSecondPlayerReply.data.settings.custom.players;
    });

    it("should create and connect all of the conductor's players", (done) => {
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
          bluebird.delay(1000).then(done);
        })
        .catch((err) => {
          logger.error(err);
          done();
        });
    });

    it('should verify that the players are connected and in an idle state', (done) => {
      let success = true;
      let nTimes = 0;
      bluebird
        .map(players, (player) => {
          const requestParams = {
            method: 'GET',
            uri: player.endpoint,
            json: true,
          };
          return request(requestParams).then((reply) => {
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

    it('should start printing a .esh file', async function () {
      this.timeout(15000);
      await bluebird.delay(5000);
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
      fileUuid = fileReply.data[0].uuid;

      // Kick off the job
      const startReply = await request({
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: {
          command: 'startJob',
          fileUuid,
        },
        json: true,
      }).catch((err) => {
        console.log('start printing .esh error', err);
      });

      jobUuid = startReply.data.currentJob.uuid;

      should(startReply.data.state).equal('executingJob');
      should(startReply.data.currentJob.state).equal('running');
      should(startReply.status).equal(200);
      should(startReply.query).equal('Process Bot Command');
    });

    it('should pause printing a .esh file', async function () {
      this.timeout(10000);
      await bluebird.delay(5000);

      const pauseReply = await request({
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: { command: 'pause' },
        json: true,
      }).catch((err) => {
        console.log('pause printing .esh error', err);
      });

      should(pauseReply.data.state).equal('pausing');
      should(pauseReply.status).equal(200);
      should(pauseReply.query).equal('Process Bot Command');
    });

    it('should finish pausing', async function () {
      this.timeout(25000);
      await bluebird.delay(20000);

      const getReply = await request({
        method: 'GET',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        json: true,
      }).catch((err) => {
        console.log('pause printing .esh error', err);
      });

      should(getReply.data.state).equal('paused');
      should(getReply.status).equal(200);
    });

    it('should resume printing a .esh file', async function () {
      this.timeout(10000);
      await bluebird.delay(5000);

      const resumeReply = await request({
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: { command: 'resume' },
        json: true,
      }).catch((err) => {
        console.log('resume printing .esh error', err);
      });

      should(resumeReply.data.state).equal('resuming');
      should(resumeReply.status).equal(200);
      should(resumeReply.query).equal('Process Bot Command');
    });

    it('should finish resuming', async function () {
      this.timeout(20000);
      await bluebird.delay(15000);

      const getReply = await request({
        method: 'GET',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        json: true,
      }).catch((err) => {
        console.log('resuming printing .esh error', err);
      });

      should(getReply.data.state).equal('executingJob');
      should(getReply.status).equal(200);
    });

    it('should complete printing a .esh file', async function () {
      this.timeout(100000);
      await bluebird.delay(90000);

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

    it('should start printing another .esh file', async function () {
      this.timeout(10000);

      // Kick off the job
      const startReply = await request({
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: {
          command: 'startJob',
          fileUuid,
        },
        json: true,
      }).catch((err) => {
        console.log('start printing .esh error', err);
      });

      jobUuid = startReply.data.currentJob.uuid;

      should(startReply.data.state).equal('executingJob');
      should(startReply.data.currentJob.state).equal('running');
      should(startReply.status).equal(200);
      should(startReply.query).equal('Process Bot Command');
    });

    it('should cancel printing a .esh file', async () => {
      const cancelReply = await request({
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: { command: 'cancel' },
        json: true,
      }).catch((err) => {
        console.log('cancel printing .esh error', err);
      });

      // TODO, check in on the job and verify that it is currently in a state of canceled
      should(cancelReply.data.state).equal('cancelingJob');
      should(cancelReply.status).equal(200);
      should(cancelReply.query).equal('Process Bot Command');
    });

    it('should finish canceling a .esh file', async function () {
      this.timeout(40000);
      await bluebird.delay(30000);

      const getReply = await request({
        method: 'GET',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        json: true,
      }).catch((err) => {
        console.log('get conductor error', err);
      });

      // TODO, check in on the job and verify that it is currently in a state of canceled
      should(getReply.data.state).equal('idle');
      should(getReply.status).equal(200);
    });

    it('should disconnect the conductor', async () => {
      const disconnectReply = await request({
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: {
          command: 'disconnect',
        },
        json: true,
      }).catch((err) => {
        console.log('disconnec conductor error', err);
      });

      should(disconnectReply.data.state).equal('disconnecting');
      should(disconnectReply.status).equal(200);
      should(disconnectReply.query).equal('Process Bot Command');
    });

    it('should finish disconnecting the conductor', async function () {
      this.timeout(10000);
      await bluebird.delay(5000);

      const getReply = await request({
        method: 'GET',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        json: true,
      }).catch((err) => {
        console.log('disconnec conductor error', err);
      });

      should(getReply.data.state).equal('ready');
      should(getReply.status).equal(200);
    });

    it('should remove a player from the conductor', async () => {
      const requestParams = {
        method: 'POST',
        uri: `http://localhost:9000/v1/bots/${conductorUuid}`,
        body: {
          command: 'removePlayer',
          name: virtualBot1.settings.name,
        },
        json: true,
      };
      const removePlayerReply = await request(requestParams).catch((err) => {
        console.log('remove conductor player error', err);
      });

      const replyPlayers = removePlayerReply.data.settings.custom.players;
      should(removePlayerReply.status).equal(200);
      should(Array.isArray(replyPlayers)).equal(true);
      should(replyPlayers.length).equal(players.length - 1);
      should(removePlayerReply.query).equal('Process Bot Command');
    });

    it('should clean up by removing all of the bots that were added', async () => {
      const requestParams = {
        method: 'GET',
        uri: 'http://localhost:9000/v1/bots/',
        json: true,
      };
      const getBotsReply = await request(requestParams);

      const finalBots = getBotsReply.data;
      const botRemovalPromises = [];
      for (const [botKey, bot] of _.entries(finalBots)) {
        // If the bot can't be found in the initial list of bots
        // Then delete the bot
        if (initialBots[botKey] === undefined) {
          const botPromise = new Promise(async (resolve, reject) => {
            const deleteBotParams = {
              method: 'DELETE',
              uri: `http://localhost:9000/v1/bots/${botKey}`,
              json: true,
            };

            await request(deleteBotParams).catch(() => {
              reject();
            });

            resolve();
          });

          botRemovalPromises.push(botPromise);
        }
      }
      await bluebird.all(botRemovalPromises);
    });
  });
};
