/* global describe, it */
const should = require(`should`);
const request = require(`request-promise`);
const fs = require(`fs-promise`);
const path = require(`path`);

module.exports = function toDoListTests() {
  let nJobs;
  let job;
  describe('Jobs unit test', function () {
    it('should create a job', async function (done) {
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/`,
        json: true,
      };
      job = await request(requestParams);
      should(!!job.uuid);
      should(!!job.state);
      done();
    });

    it('should have a job state of "created"', async function (done) {
      // TODO instead of referring to the job object, query the job again from the API
      should(job.state === `created`);
      done();
    });

    it('should retreive an array of existing jobs', async function (done) {
      const requestParams = {
        method: `GET`,
        uri: `http://localhost:9000/v1/jobs/`,
        json: true,
      };
      const jobs = await request(requestParams);
      should(jobs.constructor).equal(Object);
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
      };
      const uploadResponse = JSON.parse(await request(fileUploadParams));
      const file = uploadResponse[0];

      // Set the file to the job
      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}/setFile`,
        body: { fileUuid: file.uuid },
        json: true,
      };
      job = await request(requestParams);
      should(!!job.uuid);
      should(!!job.fileUuid);
      should(job.state).equal(`ready`);
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
      };
      const uploadResponse = JSON.parse(await request(fileUploadParams));
      const file = uploadResponse[0];

      const requestParams = {
        method: `POST`,
        uri: `http://localhost:9000/v1/jobs/${job.uuid}/setFile`,
        body: { fileUuid: file.uuid },
        json: true,
      };

      try {
        const res = await request(requestParams);
        // request should fail
        should(0).equal(1);
        done();
      } catch (ex) {
        should(!!ex.error);
        done();
      }
    });
  });
};
