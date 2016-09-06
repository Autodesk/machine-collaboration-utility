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
    name: `Conductor`,
  });

  _.extend(this.info, {
    connectionType: `conductor`,
    vid: undefined,
    pid: undefined,
    baudrate: undefined,
    fileTypes: ['.esh'],
    conductorPresets: {
      botModel: `Virtual`,
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
          if (player.fsm.current === `unavailable`) {
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
      self.currentJob.nMetajobs = 0;
      self.currentJob.nMetajobsComplete = 0;
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
      if (self.fsm.current === `processingJob`) {
        // Check to see if we can start a new job
        for (const [playerKey, player] of _.pairs(self.info.players)) {
          try {
            if (player.fsm.current === `processingJob`) {
              continue;
            }

            // check each player's first job. Queue it up.
            let noPrecursors = true;
            if (player.metajobQueue.length === 0) {
              self.logger.info(`${player.settings.name} metajobQueue is empty`);
              continue;
            }

            const currentJob = (Array.isArray(player.metajobQueue) && player.metajobQueue.length > 0) ? player.metajobQueue[0] : undefined;
            if (currentJob === undefined ) {
              throw `First job in metajobQueue is undefined`;
            }
            const jobObject = self.jobs.jobList[currentJob.uuid];

            // If the current job is still processing, let it go
            if (jobObject.fsm.current === `complete`) {
              player.metajobQueue.shift();
              self.currentJob.nMetajobsComplete++;
              self.currentJob.percentComplete = (self.currentJob.nMetajobsComplete / self.currentJob.nMetajobs * 100).toFixed(5);
              continue;
            }

            if (jobObject.fsm.current !== `ready`) {
              self.logger.info(`Not starting a new job from state ${self.jobs.jobList[currentJob.uuid].fsm.current}`);
              continue;
            }

            // go through every precursor to the current job
            for (const precursor of currentJob.precursors) {
              const job = self.jobs.jobList[precursor];
              if (job === undefined) {
                throw `Error, the job ${precursor} is undefined`;
              }
              // flag noPrecursors if any of the jobs aren't complete yet
              if (job.fsm.current !== `complete`) {
                self.logger.info(`${currentJob.botUuid} job ${currentJob.uuid} won't start because job ${job.uuid} is ${job.fsm.current}`);
                noPrecursors = false;
              }
            }
            if (noPrecursors) {
              try {
                if (
                  player.currentJob &&
                  (
                    player.currentJob.fsm.current === `paused` ||
                    player.currentJob.fsm.current === `pausing` ||
                    player.currentJob.fsm.current === `resuming` ||
                    player.currentJob.fsm.current === `running` ||
                    player.currentJob.fsm.current === `canceling`
                  )
                ) {
                  continue;
                }
                if (player.fsm.current === `parked`) {
                  const unparkParams = {
                    xEntry: currentJob.x_entry,
                    dryJob: currentJob.dry,
                  };
                  player.commands.unpark(player, unparkParams);
                  continue;
                }
                if (player.fsm.current !== `connected`) {
                  // i.e. paused, parking or unparking
                  self.logger.info(`Not starting a new job when bot is in state ${player.fsm.current}`);
                  continue;
                }
                const jobToStart = self.jobs.jobList[currentJob.uuid];
                if (jobToStart === undefined) {
                  throw `job ${currentJob.uuid} is undefined`;
                }
                bwait(Promise.delay(100));
                bwait(jobToStart.start());
                self.logger.info(`${player.settings.botUuid}, Just started ${currentJob.uuid}`);
              } catch (ex) {
                self.logger.error(`Job start fail`, ex);
              }
            } else {
              if (
                player.fsm.current === `parked` ||
                player.fsm.current === `parking` ||
                player.fsm.current === `unparking` ||
                player.fsm.current === `startingJob` ||
                player.fsm.current === `stopping`
              ) {
                continue;
              }
              // Just sitting there in the ready position. park instead
              player.commands.park(player);
            }
          } catch (ex) {
            self.logger.error(`Checking player ${playerKey} error:`, ex);
          }
        }

        // Check if all of the jobs are done
        let doneConducting = true;
        for (const [playerKey, player] of _.pairs(self.metajobCopy.bots)) {
          for (const job of player.jobs) {
            if (self.jobs.jobList[job.uuid].fsm.current !== `complete`) {
              doneConducting = false;
              break;
            }
          }
        }
        if (doneConducting) {
          bwait(self.fsm.stop());
          bwait(self.fsm.stopDone());
          self.currentJob.percentComplete = 100;
          bwait(self.currentJob.fsm.runningDone());
          bwait(self.currentJob.stopwatch.stop());
        }
      }
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
              case `Escher2HydraPrint`:
                endpoint = `http://${botName.toLowerCase().replace(`hydraprint`, ``)}.local/v1/bots/solo`;
                break;
              case `virtual`:
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
    uploadAndSetupPlayerJobs: bsync(function(self, job) {
      self.nJobs = 0;
      self.nJobsComplete = 0;

      const filesApp = self.app.context.files;
      const theFile = filesApp.getFile(job.fileUuid);
      try {
        bwait(new Promise(bsync((resolve, reject) => {
          // Open and unzip the file
          bwait(fs.createReadStream(theFile.filePath))
          .pipe(unzip.Extract({ path: theFile.filePath.split(`.`)[0] }))
          // As soon as the file is done being unzipped
          .on(`close`, bsync(() => {
            // Read the metajob.json file inside of the unzipped folder
            self.metajob = JSON.parse(JSON.stringify(require(theFile.filePath.split(`.`)[0] + `/metajob.json`)));
            // Convert the list of players into an array so that we can map the array
            self.metajobCopy = JSON.parse(JSON.stringify(require(theFile.filePath.split(`.`)[0] + `/metajob.json`)));
            bwait(Promise.map(_.pairs(self.metajob.bots), bsync(([metajobPlayerKey, metajobPlayer]) => {
              self.currentJob.nMetajobs += metajobPlayer.jobs.length;
              // find the bot that corresponds with the metajob player we're currently populating
              let botUuid;
              for (const [playerKey, player] of _.pairs(self.info.players)) {
                if (
                  player.settings.conductorX === String(metajobPlayer.layout_location_x) &&
                  player.settings.conductorY === String(metajobPlayer.layout_location_y)
                ) {
                  botUuid = player.settings.uuid;
                  break;
                }
              }
              bwait(Promise.map(metajobPlayer.jobs, bsync((playerJob) => {
                let fileUuid;
                let jobUuid;
                // create a file with a custom path and uuid
                const jobFilePath = theFile.filePath.split(`.`)[0] + '/' + playerJob.filename;
                fileUuid = playerJob.uuid;
                self.app.context.files.createFile(undefined, jobFilePath, fileUuid);

                const createJobReply = bwait(self.jobs.createJob(botUuid, fileUuid, playerJob.uuid, false));
                jobUuid = createJobReply.uuid;

                self.nJobs++;
                // add the job to a list
                // the array order from metajob must be maintained
                playerJob.botUuid = botUuid;
                playerJob.state = self.jobs.jobList[jobUuid].fsm.current;
              }, { concurrency: 4 })));
              self.info.players[botUuid].metajobQueue = metajobPlayer.jobs;
            }, { concurrency: 4 })));
            resolve();
          }));
        })));
      } catch (ex) {
        self.logger.error(ex);
      }
    }),
  });
};

module.exports = ConductorVirtual;
