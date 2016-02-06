/* global describe, it */
const should = require(`should`);
const request = require(`request-promise`);
const fs = require(`fs-promise`);
const path = require(`path`);
const Promise = require(`bluebird`);

module.exports = function toDoListTests() {
  describe('Gcode Client unit test', function () {
    let job;
    it('should setup a job and a file', async function (done) {
      try {
        // Create a job
        const jobParams = {
          method: `POST`,
          uri: `http://localhost:9000/v1/jobs/`,
          json: true,
        };
        job = await request(jobParams);
        should(!!job.id);
        should(job.state).equal(`created`);

        // Upload a file
        const testFilePath = path.join(__dirname, `wait.gcode`);
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
          uri: `http://localhost:9000/v1/jobs/${job.id}/setFile`,
          body: { fileId: file.id },
          json: true,
        };
        job = await request(setFileToJobParams);
        done();
      } catch (ex) {
        console.log('test error:', ex);
      }
    });
  });
};
