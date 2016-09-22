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
  });

  _.extend(this.info, {
    connectionType: 'conductor',
    vid: undefined,
    pid: undefined,
    baudrate: undefined,
    fileTypes: ['.esh'],
    conductorPresets: {
      botModel: 'Virtual',
      nPlayers: [5, 1],
    },
    players: {},
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
        for(const [playerKey, player] of _.pairs(self.info.players)) {
          self.logger.info('starting to connect', playerKey);
          if (player.fsm.current === 'unavailable') {
            bwait(player.commands.checkSubscription(player));
          }
          player.commands.connect(player);
        }
        self.commands.toggleUpdater(self, { update: true });
        self.fsm.connectDone();
      } catch (ex) {
        self.logger.error(ex);
        self.fsm.connectFail();
      }
    }),
    disconnect: function disconnect(self) {
      self.fsm.disconnect();
      try {
        _.pairs(self.info.players).forEach(([playerKey, player]) => {
          self.logger.info('starting to disconnect', playerKey);
          player.commands.disconnect(player);
        });
        // TODO actually check this
        self.commands.toggleUpdater(self, { update: false });
        self.fsm.disconnectDone();
      } catch (ex) {
        self.logger.error(ex);
        self.fsm.disconnectFail();
      }
    },
    startJob: bsync(function startJob(self, params) {
      const job = params.job;
      self.currentJob = job;
      self.currentJob.collaboratorCheckpoints = {};
      self.fsm.start();

      try {
        bwait(this.uploadAndSetupPlayerJobs(self, job));
        self.logger.info('All files uploaded and set up');
        self.logger.info('Players have begun');
        for(const [playerKey, player] of _.pairs(self.info.players)) {
          self.logger.info(`${player.settings.name}, is prepared to process ${player.metajobQueue.length} jobs`);
        }
        // then grab each player's first job
      } catch (ex) {
        self.logger.error(`Conductor failed to start job: ${ex}`);
      }

      self.fsm.startDone();
    }),
    updateRoutine: bsync(function updateRoutine(self, params) {
      console.log('Conductor update');
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
      for (let playerX = 1; playerX <= this.info.conductorPresets.nPlayers[0]; playerX++) {
        for (let playerY = 1; playerY <= this.info.conductorPresets.nPlayers[1]; playerY++) {
          // Check if a bot exists with that end point
          const botModel = this.info.conductorPresets.botModel;
          const botName = `${botModel}-${playerX}-${playerY}`;
          const bots = this.app.context.bots.getBots();
          let unique = true;
          for (const botKey in bots) {
            const conductorBot = bots[botKey];
            if (
              parseInt(bots[botKey].settings.conductorX, 10) === playerX &&
              parseInt(bots[botKey].settings.conductorY, 10) === playerY
            ) {
              unique = false;
              break;
            }
          }

          let endpoint;
          if (unique) {
            switch (botModel) {
              case 'Escher2HydraPrint':
                endpoint = `http://${botName.toLowerCase().replace('hydraprint', '')}.local/v1/bots/solo`;
                break;
              case 'virtual':
                endpoint = `http://localhost:${process.env.PORT}/v1/bots/${newBot.settings.uuid}`;
                break;
              default:
                endpoint = `http://${botName}.local/v1/bots/solo`;
            }
            const newBot = bwait(
              this.app.context.bots.createPersistentBot({
                name: `${botModel}-${playerX}-${playerY}`,
                model: botModel,
                endpoint,
                conductorX: playerX,
                conductorY: playerY,
              })
            );
          }
        }
      }
      for (const [botKey, bot] of _.pairs(this.app.context.bots.botList)) {
        if (
          bot.settings.conductorX !== null &&
          bot.settings.conductorY !== null
        ) {
          this.info.players[botKey] = bot;
          if (!Array.isArray(this.info.players[botKey].metajobQueue)) {
            this.info.players[botKey].metajobQueue = [];
          }
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
            collaborators: self.currentJob.collaboratorCheckpoints,
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

      self.currentJob.collaboratorCheckpoints[bot] = checkpoint;
      self.commands.updatePlayers(self);
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
              self.currentJob.collaboratorCheckpoints[player.settings.name] = 0;
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
