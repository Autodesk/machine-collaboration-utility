/* global describe, it */
const should = require(`should`);
const request = require(`request-promise`);
const fs = require(`fs-promise`);
const path = require(`path`);
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

module.exports = function toDoListTests() {
  let job;
  let nJobs;
  let botId;

  describe('Jobs unit test', function () {
    it('should create a virtual printer to execute jobs on', async function (done) {
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

    it('should create a job', async function (done) {
      const requestParams = {
        body: { botId },
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/`,
        json: true,
      };
      const jobCreateReply = await request(requestParams);
      job = jobCreateReply.data;
      should(!!job.uuid);
      should(!!job.state);
      should(jobCreateReply.status).equal(201);
      should(jobCreateReply.query).equal(`Create Job`);
      done();
    });

    it('should have a job state of "created"', async function (done) {
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        json: true,
      };
      const getJobReply = await request(requestParams);
      job = getJobReply.data;
      should(job.state === `created`);
      should(getJobReply.status).equal(200);
      should(getJobReply.query).equal(`Get Job`);
      done();
    });

    it('should retreive an array of existing jobs', async function (done) {
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/jobs/`,
        json: true,
      };
      const getJobsReply = await request(requestParams);
      const jobs = getJobsReply.data;
      should(jobs.constructor).equal(Object);
      should(getJobsReply.status).equal(200);
      should(getJobsReply.query).equal(`Get Jobs`);

      nJobs = Object.keys(jobs).length;
      done();
    });

    it('should assign a file to a job', async function (done) {
      // Upload a file
      const testFilePath = path.join(__dirname, `blah.txt`);
      const fileStream = await fs.createReadStream(testFilePath);
      const formData = { file: fileStream };
      const fileUploadParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/files`,
        formData,
        json: true,
      };
      const getFilesReply = await request(fileUploadParams);
      const file = getFilesReply.data[0];

      // Set the file to the job
      const requestParams = {
        method: `PUT`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        body: { fileUuid: file.uuid },
        json: true,
      };
      const setFileToJobReply = await request(requestParams);
      job = setFileToJobReply.data;
      should(!!job.uuid);
      should(!!job.fileUuid);
      should(job.state).equal(`settingFile`); // could be a race case? might also be ready
      should(setFileToJobReply.status).equal(200);
      should(setFileToJobReply.query).equal(`Set File to Job`);
      done();
    });

    it('should fail if it trys to assign a second file to a job', async function (done) {
      // Upload a file
      const testFilePath = path.join(__dirname, `blah.txt`);
      const fileStream = await fs.createReadStream(testFilePath);
      const formData = { file: fileStream };
      const fileUploadParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/files`,
        formData,
        json: true,
      };
      const setFileToJobReply = await request(fileUploadParams);
      const file = setFileToJobReply.data[0];

      const requestParams = {
        method: `PUT`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        body: { fileUuid: file.uuid },
        json: true,
      };

      try {
        const setFileToJobReply = await request(requestParams);
        // request should fail
        should(0).equal(1);
        done();
      } catch (ex) {
        should(!!ex.error);
        should(ex.error.status).equal(500);
        should(ex.error.query).equal(`Set File to Job`);
        done();
      }
    });

    it('should delete a job', async function (done) {
      const requestParams = {
        method: `DELETE`,
        uri: `http://localhost:9000/v1/jobs/`,
        body: {
          uuid: job.uuid,
        },
        json: true,
      };
      const deleteJobReply = await request(requestParams);
      should(deleteJobReply.data.indexOf('deleted') !== -1).equal(true);
      should(deleteJobReply.status).equal(200);
      should(deleteJobReply.query).equal(`Delete Job`);
      done();
    });
  });
};
