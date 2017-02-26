/* global describe, it */
const should = require('should');
const request = require('request-promise');
const fs = require('fs-promise');
const path = require('path');
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

module.exports = function jobsTests() {
  let job;
  let nJobs;
  let botUuid;
  let fileUuid;

  describe('Jobs unit test', function () {
    it('should create a virtual printer to execute jobs on', function (done) {
      const requestParams = {
        method: 'POST',
        uri: 'http://localhost:9000/v1/bots/',
        body: {
          model: 'Virtual',
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
    });

    it('should upload a file for a job to process', function (done) {
      // Upload a file
      const testFilePath = path.join(__dirname, 'blah.txt');
      const fileStream = fs.createReadStream(testFilePath);
      const formData = { file: fileStream };
      const fileUploadParams = {
        method: 'POST',
        uri: 'http://localhost:9000/v1/files',
        formData,
        json: true,
      };
      request(fileUploadParams)
      .then((getFilesReply) => {
        fileUuid = getFilesReply.data[0].uuid;
        done();
      })
      .catch((error) => {
        logger.error(error);
        done();
      });
    });

    it('should create a job', function (done) {
      const requestParams = {
        body: {
          botUuid,
          fileUuid,
        },
        method: 'POST',
        uri: 'http://localhost:9000/v1/jobs/',
        json: true,
      };
      request(requestParams)
      .then((jobCreateReply) => {
        job = jobCreateReply.data;
        should(!!job.uuid);
        should(!!job.state);
        should(jobCreateReply.status).equal(201);
        should(jobCreateReply.query).equal('Create Job');
        done();
      })
      .catch((error) => {
        logger.error(error);
        done();
      });
    });

    it('should have a job state of "ready"', function (done) {
      const requestParams = {
        method: 'GET',
        uri: `http://localhost:9000/v1/jobs/${job.uuid}`,
        json: true,
      };
      request(requestParams)
      .then((getJobReply) => {
        job = getJobReply.data;
        should(job.state === 'ready');
        should(getJobReply.status).equal(200);
        should(getJobReply.query).equal('Get Job');
        done();
      });
    });

    it('should retreive an array of existing jobs', function (done) {
      const requestParams = {
        method: 'GET',
        uri: 'http://localhost:9000/v1/jobs/',
        json: true,
      };
      request(requestParams)
      .then((getJobsReply) => {
        const jobs = getJobsReply.data;
        should(jobs.constructor).equal(Object);
        should(getJobsReply.status).equal(200);
        should(getJobsReply.query).equal('Get Jobs');

        nJobs = Object.keys(jobs).length;
        done();
      });
    });

    it('should delete a job', function (done) {
      const requestParams = {
        method: 'DELETE',
        uri: 'http://localhost:9000/v1/jobs/',
        body: {
          uuid: job.uuid,
        },
        json: true,
      };
      request(requestParams)
      .then((deleteJobReply) => {
        should(deleteJobReply.data.indexOf('deleted') !== -1).equal(true);
        should(deleteJobReply.status).equal(200);
        should(deleteJobReply.query).equal('Delete Job');
        done();
      });
    });

    it('should clean up', function (done) {
      // Delete the file that you uploaded
      const requestParams = {
        method: 'DELETE',
        uri: 'http://localhost:9000/v1/files/',
        body: {
          uuid: fileUuid,
        },
        json: true,
      };
      request(requestParams)
      .then(() => {
        const deleteBotParams = {
          method: 'DELETE',
          uri: `http://localhost:9000/v1/bots/${botUuid}`,
          json: true,
        };
        request(deleteBotParams)
        .then(() => {
          done();
        });
      });
    });
  });
};
