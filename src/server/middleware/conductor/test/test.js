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

module.exports = function conductorTests() {
  let jobUuid;
  let fileUuid;
  describe('UI unit test', function () {
    it('should upload an escher file', async function (done) {
      try {
        const escherFilePath = path.join(__dirname, `conductor-test.zip`);
        const fileStream = await fs.createReadStream(escherFilePath);
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
        fileUuid = uploadFileReply.data[0].uuid;
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });
    it('should create a conductor job', async function (done) {
      try {
        const requestParams = {
          body: {
            botId: -1,
            fileUuid,
          },
          method: `POST`,
          uri: `http://localhost:9000/v1/jobs/`,
          json: true,
        };
        const jobCreateReply = await request(requestParams);
        const job = jobCreateReply.data;
        should(!!job.uuid);
        should(!!job.state);
        jobUuid = job.uuid;
        should(jobCreateReply.status).equal(201);
        should(jobCreateReply.query).equal(`Create Job`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });
    it('should connect the conductor', async function (done) {
      try {
        const requestParams = {
          body: {
            command: `connect`,
          },
          method: `POST`,
          uri: `http://localhost:9000/v1/conductor`,
          json: true,
        };
        const conductorCommandReply = await request(requestParams);
        console.log('conductor command reply', conductorCommandReply);
        should(conductorCommandReply.status).equal(200);
        should(conductorCommandReply.query).equal(`Process Conductor Command`);
        should(
          conductorCommandReply.data.state === `connecting` ||
          conductorCommandReply.data.state === `connected`
        );
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });
    it('should see a connected conductor after 5 seconds', async function (done) {
      try {
        this.timeout(5000);
        await Promise.delay(4000);
        const requestParams = {
          method: `GET`,
          uri: `http://localhost:9000/v1/conductor`,
          json: true,
        };
        const conductorStatus = await request(requestParams);
        should(conductorStatus.status).equal(200);
        should(conductorStatus.query).equal(`Get Conductor`);
        should(conductorStatus.data.state).equal(`connected`);
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });
    // it('should start the job', async function (done) {
    //   try {
    //     this.timeout(10000);
    //     const setFileToJobParams = {
    //       method: `POST`,
    //       uri: `http://localhost:9000/v1/jobs/${jobUuid}`,
    //       body: {
    //         command: `start`,
    //       },
    //       json: true,
    //     };
    //     try {
    //       await request(setFileToJobParams);
    //     } catch (ex) {
    //       console.log('flailboat', ex);
    //     }
    //     await Promise.delay(9000);
    //     done();
    //   } catch (ex) {
    //     logger.error(ex);
    //   }
    // });
    it('should see a populated metajob', async function (done) {
      try {
        this.timeout(10000);
        await Promise.delay(2000);
        const getConductorRequest = {
          method: `GET`,
          uri: `http://localhost:9000/v1/conductor`,
          json: true,
        };
        try {
          const getConductorReply = await request(getConductorRequest);
        } catch (ex) {
          console.log('flailboat', ex);
        }
        done();
      } catch (ex) {
        logger.error(ex);
      }
    });
  });
};
