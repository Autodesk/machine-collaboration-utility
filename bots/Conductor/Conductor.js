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

const DefaultBot = require('../DefaultBot');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

function isLocalPlayer(player) {
  return player.endpoint.includes(ip.address()) || player.endpoint.includes('localhost');
}

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
      botModel: 'HardwareHub',
    },
  });


  _.extend(this.commands, {
    connect: bsync(function connect(self) {
      try {
        if (self.fsm.current !== 'ready') {
          throw new Error(`Cannot connect from state "${self.fsm.current}"`);
        }
        self.fsm.connect();
        bwait(self.commands.setupConductorArms(self));

        // Go through each player and connect it

        const players = self.settings.custom.players;

        for (const player of players) {
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
            self.logger.error('Connect player request fail', ex, connectParams);
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
      if (!botFsmDefinitions.metaStates.connected.includes(self.fsm.current)) {
        throw new Error(`Cannot disconnect from state "${self.fsm.current}"`);
      }
      try {
        self.fsm.disconnect();

        const players = self.settings.custom.players;
        for (const player of players) {
          const connectParams = {
            method: 'POST',
            uri: player.endpoint,
            body: {
              command: 'disconnect',
            },
            json: true,
          };
          try {
            bwait(request(connectParams));
          } catch (ex) {
            self.logger.error('Disconnect player request fail', ex);
          }
        }
        // TODO actually check this
        self.commands.toggleUpdater(self, { update: false });
        self.fsm.disconnectDone();
      } catch (ex) {
        self.logger.error(ex);
        self.fsm.disconnectFail();
      }

      return self.getBot();
    },

    pause: async function pause(self, params) {
      // TODO should not be able to pause unless all players are running
      if (self.currentJob === undefined) {
        throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
      }
      if (self.fsm.current !== 'executingJob') {
        throw new Error(`Cannot pause bot from state "${self.fsm.current}"`);
      }
      if (self.currentJob.fsm.current !== 'running') {
        throw new Error(`Cannot pause job from state "${self.currentJob.fsm.current}"`);
      }

      try {
        self.fsm.pause();
        const players = self.settings.custom.players;
        for (const player of players) {
          // Ping each job for status
          const pauseJobParams = {
            method: 'POST',
            uri: player.endpoint,
            body: { command: 'pause' },
            json: true,
          };
          const pauseJobReply = await request(pauseJobParams)
          .catch(ex => {
            self.logger.error('Pause fail', ex);
          });
        }
        self.currentJob.fsm.pause();
        self.fsm.pauseDone();
      } catch (ex) {
        self.logger.error(ex);
      }
      return self.getBot();
    },

    resume: async function resume(self) {
      // TODO should not be able to resume unless all players are paused
      if (self.currentJob === undefined) {
        throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
      }
      if (self.fsm.current !== 'paused') {
        throw new Error(`Cannot resume bot from state "${self.fsm.current}"`);
      }
      if (self.currentJob.fsm.current !== 'paused') {
        throw new Error(`Cannot resume job from state "${self.currentJob.fsm.current}"`);
      }
      try {
        self.fsm.resume();
        const players = self.settings.custom.players;
        for (const player of players) {
          // Ping each job for status
          const resumeParams = {
            method: 'POST',
            uri: player.endpoint,
            body: { command: 'resume' },
            json: true,
          };
          const resumeReply = await request(resumeParams)
          .catch(ex => {
            self.logger.error('Resume conductor player fail', ex);
          });
        }
        self.currentJob.fsm.resume();
        self.fsm.resumeDone();
      } catch (ex) {
        self.logger.error(ex);
      }
      return self.getBot();
    },

    cancel: function cancel(self) {
      if (!botFsmDefinitions.metaStates.processingJob.includes(self.fsm.current)) {
        throw new Error(`Cannot cancel Conductor from state "${self.fsm.current}"`);
      }
      if (self.currentJob === undefined) {
        throw new Error(`Conductor should currently have a job associated with it.`);
      }
      if (!jobFsmDefinitions.metaStates.processingJob.includes(self.currentJob.fsm.current)) {
        throw new Error(`Cannot cancel Conductor job from state ${self.currentJob.fsm.current}`);
      }
      try {
        self.fsm.cancel();
        const players = self.settings.custom.players;
        for (const player of players) {
           // Cancel each bot
          const cancelJobParams = {
            method: 'POST',
            uri: player.endpoint,
            body: {
              command: 'cancel',
            },
            json: true,
          };
          try {
            const cancelJobReply = bwait(request(cancelJobParams));
          } catch (ex) {
            self.logger.error('Cancel fail', ex);
          }
        }
        self.currentJob.fsm.cancel();
        self.currentJob = undefined;
        self.fsm.cancelDone();
      } catch (ex) {
        self.logger.error(ex);
      }
      return self.getBot();
    },

    startJob: bsync(function startJob(self, params) {
      if (self.fsm.current !== 'idle') {
        throw new Error(`Cannot start job from state "${self.fsm.current}"`);
      }
      if (self.currentJob !== undefined) {
        throw new Error(`Bot should not currently have a job associated with it.`);
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
        self.currentJob = bwait(jobMiddleware.createJob(botUuid, fileUuid));

        // set up the file executor
        bwait(self.commands.uploadAndSetupPlayerJobs(self));
        self.logger.info('All files uploaded and set up');
        self.currentJob.start();
        // Start consuming the file
        self.fsm.startDone();
      } catch (ex) {
        self.fsm.startJobFail();
      }

      return self.getBot();
    }),

    updateRoutine: bsync(function updateRoutine(self, params) {
      let doneConducting = true;
      let accumulatePercentComplete = 0;

      // If we're connected
      if (botFsmDefinitions.metaStates.connected.includes(self.fsm.current)) {
        const players = self.settings.custom.players;

        for (const player of players) {
          // Ping each player for status
          const pingJobParams = {
            method: 'GET',
            uri: player.endpoint,
            json: true,
          };
          try {
            const pingReply = bwait(request(pingJobParams));
            if (botFsmDefinitions.metaStates.processingJob.includes(self.fsm.current)) {
              if (botFsmDefinitions.metaStates.processingJob.includes(pingReply.data.state)) {
                accumulatePercentComplete += pingReply.data.currentJob.percentComplete == undefined ?
                  0 : pingReply.data.currentJob.percentComplete;
                doneConducting = false;
              } else {
                accumulatePercentComplete += 100;
              }
              // Add the job's percent complete to the running total
            }
          } catch (ex) {
            console.log('Ping player error', ex);
            doneConducting = false;
          }
        }

        // If still processing job, but done conducting, then complete and cleanup
        if (botFsmDefinitions.metaStates.processingJob.includes(self.fsm.current)) {
          if (doneConducting && self.fsm.current === 'executingJob') {
            self.fsm.complete();
            self.currentJob.percentComplete = 100;
            self.currentJob.fsm.completeJob();
            self.currentJob.stopwatch.stop();
            self.currentJob = undefined;
            self.fsm.completeDone();
            bwait(Promise.delay(2000));
            self.app.io.broadcast('botEvent', {
              uuid: self.settings.uuid,
              event: 'update',
              data: self.getBot(),
            });
          } else {
            if (self.settings.custom.players.length === 0) {
              self.currentJob.percentComplete = 0;
            } else {
              self.currentJob.percentComplete = Number(accumulatePercentComplete / self.settings.custom.players.length).toFixed(3);
            }
          }
        }
      }
    }),

    // If the database doesn't yet have printers for the endpoints, create them
    setupConductorArms: bsync((self, params) => {
      try {
        // Sweet through every player
        const players = self.settings.custom.players;

        for (const player of players) {
          // Check if a bot exists with that end point
          let created = false;
          for (const [botUuid, bot] of _.pairs(self.app.context.bots.botList)) {
            if (
              (
                bot.settings.endpoint === player.endpoint &&
                bot.settings.name === player.name
              ) ||
              isLocalPlayer(player)
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
        self.settings.custom.players = playerArray;
        bwait(self.updateBot({ custom: { players: playerArray } }));
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

    uploadAndSetupPlayerJobs: bsync(function(self) {
      const job = self.currentJob;
      try {
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
                const players = self.settings.custom.players;
                for (const player of players) {
                  self.collaboratorCheckpoints[player.name] = 0;
                }
                bwait(self.commands.updatePlayers(self));
                self.logger.info('updated the players');
                for (const player of players) {
                  // For each player we're going to upload a file, and then create a job
                  // Get the bot's uuid
                  const getBotUuidParams = {
                    method: 'GET',
                    uri: player.endpoint,
                    json: true,
                  };
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
                    uri: `${player.endpoint.split('/v1/bots')[0]}/v1/files`,
                    formData,
                    json: true,
                  };
                  const uploadFileReply = bwait(request(fileParams));

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
                  const startJobReply = bwait(request(jobParams));
                  bwait(Promise.delay(2000));
                }
                resolve();
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
