const util = require('util');
const request = require('request-promise');
const unzip = require('unzip2');
const fs = require('fs');
const Promise = require('bluebird');
const _ = require('underscore');
const bsync = require('asyncawait/async');
const bwait = require('asyncawait/await');
const path = require('path');
const ip = require('ip');

const Jobs = require(path.join(__dirname, '../server/middleware/jobs'));
const DefaultBot = require('./DefaultBot');

const ConductorVirtual = function ConductorVirtual(app) {
  DefaultBot.call(this, app);

  this.collaboratorCheckpoints = {};

  _.extend(this.settings, {
    model: __filename.split(`${__dirname}/`)[1].split('.js')[0],
    name: 'Conductor',
    custom: {
      players: [],
    },
  });

  _.extend(this.info, {
    connectionType: 'conductor',
    fileTypes: ['.esh'],
    conductorPresets: {
      botModel: 'Virtual',
    },
  });


  _.extend(this.commands, {
    connect: bsync(function connect(self) {
      try {
        self.fsm.connect();
        bwait(self.commands.setupConductorArms(self));

        // Go through each player and connect it
        for (const player of self.settings.custom.players) {
          const connectParams = {
            method: 'POST',
            uri: player.endpoint,
            body: {
              command: 'connect',
            },
            json: true,
          };
          try {
            bwait(request(connectParams));
          } catch (ex) {
            self.logger.error('Connect player request fail', ex);
          }
        }

        // Then enable the conductor updater function
        self.commands.toggleUpdater(self, { update: true });

        // Then you're done
        self.fsm.connectDone();
      } catch (ex) {
        self.logger.error(ex);
        self.fsm.connectFail();
      }
    }),
    disconnect: function disconnect(self) {
      try {
        self.fsm.disconnect();
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
      try {
        const job = params.job;
        self.currentJob = job;
        self.fsm.start();
        bwait(self.commands.uploadAndSetupPlayerJobs(self, job));
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
      try {
        // Sweet through every player
        for (const player of self.settings.custom.players) {
          // Check if a bot exists with that end point
          let created = false;
          for (const [botUuid, bot] of _.pairs(self.app.context.bots.botList)) {
            if (
              bot.settings.endpoint === player.endpoint &&
              bot.settings.name === player.name
            ) {
              created = true;
            }
          }

          // If it doesn't, create it
          if (!created) {
            try {
              const newBot = bwait(
                this.app.context.bots.createPersistentBot({
                  name: player.name,
                  endpoint: player.endpoint,
                  model: self.info.conductorPresets.botModel,
                })
              );
              self.logger.info('Just created bot', newBot.getBot());
            } catch (ex) {
              self.logger.error('Create bot fail', ex);
            }
          }
        }
      } catch (ex) {
        self.logger.error(ex);
      }
    }),
    updatePlayers: bsync(function(self) {
      try {
        for (const player of self.settings.custom.players) {
          const updatePlayerParams = {
            method: 'POST',
            uri: player.endpoint,
            body: {
              command: 'updateCollaboratorCheckpoints',
              collaborators: self.collaboratorCheckpoints,
            },
            json: true,
          };
          const updateCollaboratorReply = bwait(request(updatePlayerParams));
        }
      } catch (ex) {
        self.logger.error(ex);
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
    addPlayer: bsync(function(self, params) {
      try {
        const name = params.name;
        if (name === undefined) {
          throw '"name" is undefined';
        }

        const endpoint = params.endpoint;
        if (endpoint === undefined) {
          throw '"endpoint" is undefined';
        }

        const playerArray = self.settings.custom.players;

        // Check for duplicate names or endpoints
        for (const player of playerArray) {
          if (player.name === name) {
            throw `Duplicate name "${name}".`;
          }
          if (player.endpoint === endpoint) {
            throw `Duplicate endpoint "${endpoint}".`;
          }
        }
        playerArray.push({ name, endpoint });
        bwait(self.updateBot({ custom: self.settings.custom }));
        // should update the database version of this
        return self.getBot();
      } catch (ex) {
        self.logger.error('Add player error', ex);
        throw ex;
      }
    }),
    removePlayer: bsync(function(self, params) {
      try {
        const name = params.name;
        if (name === undefined) {
          throw '"name" is undefined';
        }

        const players = self.settings.custom.players;
        let playerRemoved = false;
        for (let i = 0; i < players.length; i++) {
          const player = players[i];
          if (player.name === name) {
            players.splice(i, 1);
            playerRemoved = true;
            break;
          }
        }

        if (!playerRemoved) {
          throw `Player "${name}" could not be found.`;
        }
        bwait(self.updateBot({ custom: self.settings.custom }));
        return self.getBot();
      } catch (ex) {
        self.logger.error('error', ex);
        return ex;
      }
    }),
    uploadAndSetupPlayerJobs: bsync(function(self, job) {
      try {
        console.log('starting job');
        self.nJobs = 0;
        self.nJobsComplete = 0;

        const filesApp = self.app.context.files;
        const theFile = filesApp.getFile(job.fileUuid);
        bwait(new Promise(bsync((resolve, reject) => {
          try {
            // Open and unzip the file
            bwait(fs.createReadStream(theFile.filePath))
            .pipe(unzip.Extract({ path: theFile.filePath.split('.')[0] }))
            // As soon as the file is done being unzipped
            .on('close', bsync(() => {
              self.logger.info('unzipped file', self.settings.custom.players);
              try {
                // Reset each player's collaborator list
                for (const player of self.settings.custom.players) {
                  console.log('da player', player);
                  self.collaboratorCheckpoints[player.name] = 0;
                }
                bwait(self.commands.updatePlayers(self));
                self.logger.info('updated the players');
                for (const player of self.settings.custom.players) {
                  // For each player we're going to upload a file, and then create a job
                  // Get the bot's uuid
                  const getBotUuidParams = {
                    method: 'GET',
                    uri: player.endpoint,
                    json: true,
                  }
                  let getBotUuidReply;
                  try {
                    getBotUuidReply = bwait(request(getBotUuidParams));
                  } catch (ex) {
                    throw `nope: ${ex}`;
                  }
                  const botUuid = getBotUuidReply.data.settings.uuid;
                  // Upload a file
                  const testFilePath = theFile.filePath.split('.')[0] + '/' + player.name + '.gcode';
                  const fileStream = bwait(fs.createReadStream(testFilePath));
                  const formData = { file: fileStream };
                  const fileParams = {
                    method: 'POST',
                    uri: `${player.endpoint.split('/v1/bots/solo')[0]}/v1/files`,
                    formData,
                    json: true,
                  };
                  const uploadFileReply = bwait(request(fileParams));

                  // Create and start job
                  const jobParams = {
                    method: 'POST',
                    uri: `${player.endpoint.split('/v1/bots/solo')[0]}/v1/jobs`,
                    body: {
                      botUuid,
                      fileUuid: uploadFileReply.data[0].uuid,
                      subscribers: [
                        `http://${ip.address()}:${process.env.PORT}/v1/bots/${self.settings.uuid}`,
                      ],
                    },
                    json: true,
                  };
                  const createJobReply = bwait(request(jobParams));
                  const jobUuid = createJobReply.data.uuid;

                  const startJobParams = {
                    method: 'POST',
                    uri: `${player.endpoint.split('/v1/bots/solo')[0]}/v1/jobs/${jobUuid}`,
                    body: {
                      command: 'start',
                    },
                    json: true,
                  };
                  const startJobReply = bwait(request(startJobParams));
                  bwait(Promise.delay(2000));
                }
              } catch (ex) {
                self.logger.error(ex);
              }
            }));
          } catch (ex) {
            self.logger.error(ex);
          }
        })));
      } catch (ex) {
        self.logger.error(ex);
      }
    }),
  });
};

module.exports = ConductorVirtual;
