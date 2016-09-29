const util = require('util');
const request = require('request-promise');
const unzip = require('unzip2');
const fs = require('fs');
const Promise = require('bluebird');
const _ = require('underscore');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');
const path = require('path');

const Jobs = require(path.join(__dirname, '../server/middleware/jobs'));
const DefaultBot = require('./DefaultBot');

const ConductorVirtual = function ConductorVirtual(app) {
  DefaultBot.call(this, app);

  _.extend(this.settings, {
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
    name: 'Conductor',
    custom: {
      players: [],
    },
  });

  _.extend(this.info, {
    connectionType: 'conductor',
    vid: undefined,
    pid: undefined,
    baudrate: undefined,
    fileTypes: ['.esh'],
    conductorPresets: {
      botModel: 'Virtual',
    },
  });


  _.extend(this.commands, {
    initialize: bsync(function initialize(self) {
      const config = app.context.config;
      const jobsUrl = `/${config.apiVersion}/bots/${self.settings.uuid}/jobs`;
      self.jobs = new Jobs(self.app, jobsUrl);
      self.jobs.initialize();
    }),
    connect: bsync(function connect(self) {
      self.fsm.connect();
      try {
        bwait(this.setupConductorArms());
        // go through each player and connect it

        // Then enable the conductor updater function
        // self.commands.toggleUpdater(self, { update: true });

        // Then you're done
        // self.fsm.connectDone();
      } catch (ex) {
        self.logger.error(ex);
        self.fsm.connectFail();
      }
    }),
    disconnect: function disconnect(self) {
      self.fsm.disconnect();
      try {
        // _.pairs(self.info.players).forEach(([playerKey, player]) => {
        //   self.logger.info('starting to disconnect', playerKey);
        //   player.commands.disconnect(player);
        // });
        // // TODO actually check this
        // self.commands.toggleUpdater(self, { update: false });
        self.fsm.disconnectDone();
      } catch (ex) {
        self.logger.error(ex);
        self.fsm.disconnectFail();
      }
    },
    startJob: bsync(function startJob(self, params) {
      const job = params.job;
      self.currentJob = job;
      self.fsm.start();

      try {
        bwait(this.uploadAndSetupPlayerJobs(self, job));
        self.logger.info('All files uploaded and set up');
      } catch (ex) {
        self.logger.error(`Conductor failed to start job: ${ex}`);
      }

      self.fsm.startDone();
    }),
    updateRoutine: bsync(function updateRoutine(self, params) {
        // if (doneConducting) {
        //   bwait(self.fsm.stop());
        //   bwait(self.fsm.stopDone());
        //   self.currentJob.percentComplete = 100;
        //   bwait(self.currentJob.fsm.runningDone());
        //   bwait(self.currentJob.stopwatch.stop());
        // }
    }),
    // If the database doesn't yet have printers for the endpoints, create them
    setupConductorArms: bsync((self, params) => {
      // Sweet through every player
      for (let i = 0; i < 0; i++) {
        // Check if a bot exists with that end point
        let created = true;
        // If it doesn't, create it

        if (!created) {
          const newBot = bwait(
            this.app.context.bots.createPersistentBot({
              name: 'whatever the player name is',
              model: 'whatever the model type is',
              endpoint: 'whatever the endpoint is',
            })
          );
          self.logger.info('just created bot', newBot);
        }
      }
    }),
    updatePlayers: bsync(function(self) {
      for (const [playerKey, player] of _.pairs(self.info.players)) {
        const updatePlayerParams = {
          method: 'POST',
          uri: player.settings.endpoint,
          body: {
            command: 'updateCollaboratorCheckpoints',
            collaborators: self.collaboratorCheckpoints,
          },
          json: true,
        };
        const updateCollaboratorReply = bwait(request(updatePlayerParams));
        console.log('update results', updateCollaboratorReply);
      }
    }),
    updateCollaborativeBotCheckpoint: function(self, params) {
      const bot = params.bot;
      if (bot === undefined) {
        throw 'Param "bot" is undefined';
      }

      const checkpoint = params.checkpoint;
      if (checkpoint === undefined) {
        throw 'Param "checkpoint" is undefined';
      }
      self.logger.info('updating bot checkpoints', bot, checkpoint, self.collaboratorCheckpoints);
      self.collaboratorCheckpoints[bot] = checkpoint;
      self.logger.info(`Just updated bot ${bot} to checkpoint ${checkpoint}`, JSON.stringify(self.collaboratorCheckpoints));
      self.commands.updatePlayers(self);
    },
    addPlayer: function(self, params) {
      const name = params.name;
      if (name === undefined) {
        throw '"name" is undefined';
      }

      const endpoint = params.endpoint;
      if (endpoint === undefined) {
        throw '"endpoint" is undefined';
      }

      const playerArray = self.settings.custom.players;
      playerArray.push({ name, endpoint });
      return self.getBot();
    },
    uploadAndSetupPlayerJobs: bsync(function(self, job) {
      self.nJobs = 0;
      self.nJobsComplete = 0;

      const filesApp = self.app.context.files;
      const theFile = filesApp.getFile(job.fileUuid);
      try {
        bwait(new Promise(bsync((resolve, reject) => {
          // Open and unzip the file
          bwait(fs.createReadStream(theFile.filePath))
          .pipe(unzip.Extract({ path: theFile.filePath.split('.')[0] }))
          // As soon as the file is done being unzipped
          .on('close', bsync(() => {
            console.log('unzipped the file');

            // Reset each player's collaborator list
            for (const [playerKey, player] of _.pairs(self.info.players)) {
              self.collaboratorCheckpoints[player.settings.name] = 0;
            }
            bwait(self.commands.updatePlayers(self));

            for (const [playerKey, player] of _.pairs(self.info.players)) {
              // For each player we're going to upload a file, and then create a job
              // Get the bot's uuid
              const getBotUuidParams = {
                method: 'GET',
                uri: player.settings.endpoint,
                json: true,
              }
              const getBotUuidReply = bwait(request(getBotUuidParams));
              const botUuid = getBotUuidReply.data.settings.uuid;
              // Upload a file
              const testFilePath = theFile.filePath.split('.')[0] + '/' + player.settings.name + '.gcode';
              const fileStream = bwait(fs.createReadStream(testFilePath));
              const formData = { file: fileStream };
              const fileParams = {
                method: 'POST',
                uri: `${player.settings.endpoint.split('/v1/bots/solo')[0]}/v1/files`,
                formData,
                json: true,
              };
              const uploadFileReply = bwait(request(fileParams));
              console.log('file upload reply', uploadFileReply);

              // Create and start job
              const jobParams = {
                method: 'POST',
                uri: `${player.settings.endpoint.split('/v1/bots/solo')[0]}/v1/jobs`,
                body: {
                  botUuid,
                  fileUuid: uploadFileReply.data[0].uuid,
                },
                json: true,
              };
              console.log('creating a job with these params', jobParams);
              const createJobReply = bwait(request(jobParams));
              console.log('create job reply', createJobReply);
              const jobUuid = createJobReply.data.uuid;

              const startJobParams = {
                method: 'POST',
                uri: `${player.settings.endpoint.split('/v1/bots/solo')[0]}/v1/jobs/${jobUuid}`,
                body: {
                  command: 'start',
                },
                json: true,
              };
              const startJobReply = bwait(request(startJobParams));
              console.log('start job reply', startJobReply);
              bwait(Promise.delay(2000));
            }
          }));
        })));
      } catch (ex) {
        self.logger.error(ex);
      }
    }),
  });
};

module.exports = ConductorVirtual;
