/* global logger */
const fs = require('fs-promise');
const request = require('request-promise');
const ip = require('ip');
const unzip = require('unzip2');
const bluebird = require('bluebird');

const delay = bluebird.delay;

async function uploadAndSetupPlayerJobs(self) {
  const job = self.currentJob;
  try {
    self.nJobs = 0;
    self.nJobsComplete = 0;

    const filesApp = self.app.context.files;
    const theFile = filesApp.getFile(job.fileUuid);

    await new Promise(async (resolve) => {
      try {
        // Open and unzip the file
        await fs
          .createReadStream(theFile.filePath)
          .pipe(unzip.Extract({ path: theFile.filePath.split('.')[0] }))
          // As soon as the file is done being unzipped
          .on('close', async () => {
            logger.info('unzipped file', self.settings.custom.players);
            try {
              // Reset each player's collaborator list
              const players = self.settings.custom.players;
              players.forEach((player) => {
                self.collaboratorCheckpoints[player.name] = 0;
              });

              await self.commands.updatePlayers(self);
              logger.info('updated the players');

              await bluebird.map(players, async (player) => {
                // For each player we're going to upload a file, and then create a job

                // Upload a file
                const testFilePath = `${theFile.filePath.split('.')[0]}/${player.name}.gcode`;
                const fileStream = await fs.createReadStream(testFilePath);
                const formData = { file: fileStream };
                const fileParams = {
                  method: 'POST',
                  uri: `${player.endpoint.split('/v1/bots')[0]}/v1/files`,
                  formData,
                  json: true,
                };
                const uploadFileReply = await request(fileParams);

                // Create and start job
                const jobParams = {
                  method: 'POST',
                  uri: player.endpoint,
                  body: {
                    command: 'startJob',
                    fileUuid: uploadFileReply.data[0].uuid,
                    subscribers: [
                      `http://${ip.address()}:${process.env.PORT}/v1/bots/${self.settings.uuid}`,
                    ],
                  },
                  json: true,
                };
                logger.info('Conductor player start params', jobParams);
                await request(jobParams).catch((err) => {
                  logger.error('Start job error', err);
                });

                // No reason for this. Just looks cool when they start in a delayed order
                await delay(2000);
              });
              resolve();
            } catch (ex) {
              logger.error(ex);
            }
          });
      } catch (ex) {
        logger.error(ex);
      }
    });
  } catch (ex) {
    logger.error(ex);
  }
}

module.exports = async function startJob(self, params) {
  logger.info('Executing function "startJob"', self.getBot());
  try {
    if (self.fsm.current !== 'idle') {
      throw new Error(`Cannot start job from state "${self.fsm.current}"`);
    }
    if (self.currentJob !== undefined) {
      throw new Error('Bot should not currently have a job associated with it.');
    }
    if (params.fileUuid === undefined) {
      throw new Error('A "fileUuid" must be specified when starting a job.');
    }
    self.fsm.startJob();
    try {
      // Create a job
      const jobMiddleware = self.app.context.jobs;
      const botUuid = self.settings.uuid;
      const fileUuid = params.fileUuid;
      self.currentJob = await jobMiddleware.createJob(botUuid, fileUuid);

      // set up the file executor
      await uploadAndSetupPlayerJobs(self);
      logger.info('All files uploaded and set up');
      self.currentJob.start();
      // Start consuming the file
      self.fsm.startDone();
    } catch (ex) {
      logger.error('Conductor Start Job Fail', ex);
      self.fsm.startJobFail();
    }
  } catch (ex) {
    logger.error('Double start command error', ex);
  }
  return self.getBot();
};
