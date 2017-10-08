/* global logger */
const fs = require('fs-promise');
const _ = require('lodash');
const request = require('request-promise');
const bluebird = require('bluebird');

module.exports = async function startJob(self, params) {
  try {
    self.fsm.current = 'startingJob';
    // parse the mcu files endpoint
    const file = self.app.context.files.getFile(params.fileUuid);
    const filePath = file.filePath;
    const fileStream = await fs.createReadStream(filePath);
    const formData = { file: fileStream };

    const filesEndpoint = `${self.settings.endpoint.split('/v1')[0]}/v1/files`;
    const fileParams = {
      method: 'POST',
      uri: filesEndpoint,
      formData,
      json: true,
    };

    const uploadFileReply = await request(fileParams);
    // Create and start job
    const jobParams = {
      method: 'POST',
      uri: self.settings.endpoint,
      body: {
        command: 'startJob',
        fileUuid: uploadFileReply.data[0].uuid,
      },
      json: true,
    };

    await request(jobParams);

    // upload the file
    // start the job
  } catch (ex) {
    logger.error('Start job fail', ex);
    throw ex;
  }
  return self.getBot();
};
