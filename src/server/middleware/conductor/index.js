const router = require(`koa-router`)();
const Promise = require(`bluebird`);
const StateMachine = Promise.promisifyAll(require(`javascript-state-machine`));

const request = require(`request-promise`);
const unzip = require(`unzip2`);
const fs = require(`fs`);
const winston = require(`winston`);
const path = require(`path`);

const conductorRoutes = require(`./routes`);

/**
 * This is a Conductor class representing a system for managing multiple pieces of hardware
 *
 * The Conductor's state machine abstracts any job states (i.e. pause/resume/cancel)
 * to be handled by the Job API. In other words, in order to pause/resume/cancel the Conductor,
 * you must send that command to the job. This will pass down events accordingly to the Conductor
 *
 */
class Conductor {
  /**
   * A Conductor server class
   * @param {Object} app - The parent Koa app.
   * @param {string} routeEndpoint - The relative endpoint.
   */
  constructor(app, routeEndpoint) {
    app.context.conductor = this; // External app reference variable

    this.app = app;
    this.logger = app.context.logger;
    this.routeEndpoint = routeEndpoint;
    this.router = router;

    this.players = {};

    const filename = path.join(__dirname, `../../../../conductor-${this.app.context.config.logFileName}`);
    this.conductorLogger = new (winston.Logger)({
      level: `debug`,
      transports: [
        new (winston.transports.Console)(),
        new (winston.transports.File)({ filename }),
      ],
    });

    // File reading assets
    this.currentJob = undefined;

    this.fsm = StateMachine.create({
      initial: 'ready',
      error: (one, two) => {
        const errorMessage = `Invalid Conductor state change action "${one}". State at "${two}".`;
        this.logger.error(errorMessage);
        throw errorMessage;
      },
      events: [
        /* eslint-disable no-multi-spaces */
        { name: 'connect',             from: 'ready',            to: 'connecting'       },
        { name: 'connectFail',         from: 'connecting',       to: 'ready'            },
        { name: 'connectDone',         from: 'connecting',       to: 'connected'        },
        { name: 'start',               from: 'connected',        to: 'startingJob'      },
        { name: 'startFail',           from: 'startingJob',      to: 'connected'        },
        { name: 'startDone',           from: 'startingJob',      to: 'processingJob'    },
        { name: 'stop',                from: 'processingJob',    to: 'stopping'         },
        { name: 'stopDone',            from: 'stopping',         to: 'connected'        },
        { name: 'stopFail',            from: 'stopping',         to: 'connected'        },
        { name: 'jobToScript',         from: 'processingJob',    to: 'processingScript' },
        { name: 'jobScriptFail',       from: 'processingScript', to: 'processingJob'    },
        { name: 'jobScriptDone',       from: 'processingScript', to: 'processingJob'    },
        { name: 'connectedToScript',   from: 'connected',        to: 'processingScript' },
        { name: 'connectedScriptFail', from: 'processingScript', to: 'connected'        },
        { name: 'connectedScriptDone', from: 'processingScript', to: 'connected'        },
        { name: 'disconnect',          from: 'connected',        to: 'disconnecting'    },
        { name: 'disconnectFail',      from: 'disconnecting',    to: 'connected'        },
        { name: 'disconnectDone',      from: 'disconnecting',    to: 'ready'            },
        { name: 'unplug',              from: '*',                to: 'unavailable'      },
        /* eslint-enable no-multi-spaces */
      ],
      callbacks: {
        onenterstate: (event, from, to) => {
          this.logger.info(`Conductor event ${event}: Transitioning from ${from} to ${to}.`);
          // this.app.io.emit(`stateChange`, to);
        },
      },
    });
  }

/*******************************************************************************
 * Initialization functions
 ******************************************************************************/
  /**
   * initialize the conductor endpoint
   */
  async initialize() {
    try {
      await this.setupRouter();
      await this.setupConductorArms();
      await this.connect();
      this.logger.info(`Conductor instance initialized`);
    } catch (ex) {
      this.logger.error(`Conductor initialization error`, ex);
    }
  }

  // If the database doesn't yet have printers for the endpoints, create them
  async setupConductorArms() {
    // Sweet through every player
    for (let playerX = 0; playerX < this.app.context.config.conductor.n_players[0]; playerX++) {
      for (let playerY = 0; playerY < this.app.context.config.conductor.n_players[1]; playerY++) {
        // Check if a bot exists with that end point
        const botModel = this.app.context.config.conductor.botModel;
        const botName = `${botModel}-${playerX}-${playerY}`;
        const bots = this.app.context.bots.getBots();
        let unique = true;
        for (const botKey in bots) {
          if (bots[botKey].settings.name === botName) {
            unique = false;
            break;
          }
        }

        if (unique) {
          const newBot = await this.app.context.bots.createBot({
            name: `${botModel}-${playerX}-${playerY}`,
            model: this.app.context.config.conductor.botModel,
          });
          let endpoint;
          switch (botModel) {
            case `http`:
              endpoint = `http://${botName}.local:9000/v1/bots/solo`;
              break;
            case `Virtual`:
              endpoint = `http://localhost:${process.env.PORT}/v1/bots/${newBot.settings.uuid}`;
              break;
            default:
              endpoint = `http://${botName}.local:9000/v1/bots/solo`;
          }
          newBot.setPort(endpoint);
          this.players[newBot.settings.uuid] = newBot;
        }
      }
    }

    // Now that all of the players are added, give them an extra property 'metajobQueue'
    // This will be used to keep track of the metajob's progress

    // We will also add this conductor as a subscribed endpoint for the players
    for (const [playerKey, player] of Object.entries(this.players)) {
      const addSubscriberParams = {
        method: `POST`,
        uri: player.port,
        body: {
          command: `addSubscriber`,
          subscriberEndpoint: `http://localhost:${process.env.PORT}/v1/conductor/update`,
        },
        json: true,
      };
      try {
        await request(addSubscriberParams);
      } catch (ex) {
        this.logger.error(`Add subscriber failed`, ex);
      }
      this.players[playerKey].metajobQueue = [];
    }
  }

  /**
   * Set up the conductor's instance's router
   */
  async setupRouter() {
    try {
      // Populate this.router with all routes
      // Then register all routes with the app
      await conductorRoutes(this);

      // Register all router routes with the app
      this.app.use(this.router.routes()).use(this.router.allowedMethods());
      this.logger.info(`Conductor router setup complete`);
    } catch (ex) {
      this.logger.error(`Conductor router setup error`, ex);
    }
  }

  /*******************************************************************************
   * Core functions
   ******************************************************************************/
  /*
   * get a json friendly description of the Conductor
   */
  getConductor() {
    return {
      state: this.fsm.current,
      players: this.getPlayers(),
    };
  }

  /*
   * This is the logic for parsing any commands sent to the Conductor API
   * In all cases, the API does not wait for the command to be completed before
   * returning a reply to the requestor, instead the conductor enters the appropriate
   * transitional state, followed by either "done" or "fail" events and
   * corresponding state transitions
   */
  async processCommand(command) {
    switch (command) {
      // Connect each bot
      case `connect`:
        this.connect();
        return this.getConductor();

      // Disconnect each bot via it's queue's executor
      case `disconnect`:
        this.disconnect();
        return this.getConductor();

      // Throw out any bogus command requests
      default:
        const errorMessage = `Command "${command}" is not supported.`;
        throw errorMessage;
    }
  }

  /*
   *  Get a json friendly description of the available players
   */
  getPlayers() {
    const players = {};
    for (const player in this.players) {
      if (this.players.hasOwnProperty(player)) {
        players[player] = this.players[player].getBot();
        players[player].metajobQueue = this.players[player].metajobQueue;
        players[player].currentJobIndex = this.players[player].currentJobIndex;
      }
    }
    return players;
  }

  async handleBotUpdates(botUuid, jobUuid) {
    const player = this.players[botUuid];
    if (player !== undefined) {
      this.conductorLogger.info(`${botUuid}, Compleeeeted ${jobUuid}`);
      //await this.scanForNextJob();
    } else {
      this.logger.error(`Player ${botUuid} is undefined`);
    }
  }

  async uploadAndSetupPlayerJobs(job) {
    const self = this;

    const filesApp = self.app.context.files;
    const theFile = filesApp.getFile(job.fileUuid);
    const filePath = filesApp.getFilePath(theFile);

    try {
      await new Promise(async (resolve, reject) => {
        // Open and unzip the file
        await fs.createReadStream(filePath)
        .pipe(unzip.Extract({ path: filePath.split(`.`)[0] }))
        // As soon as the file is done being unzipped
        .on(`close`, async () => {
          // Read the metajob.json file inside of the unzipped folder
          this.metajob = require(filePath.split(`.`)[0] + `/metajob.json`);
          // Convert the list of players into an array so that we can map the array
          this.metajobCopy = JSON.parse(JSON.stringify(this.metajob));
          await Promise.map(Object.entries(this.metajob), async ([metajobPlayerKey, metajobPlayer]) => {
            // find the bot that corresponds with the metajob player we're currently populating
            let botUuid;
            const indexKey = `${metajobPlayer.location[0]}-${metajobPlayer.location[1]}`;
            for (const [playerKey, player] of Object.entries(this.players)) {
              if (player.settings.name.indexOf(indexKey) !== -1) {
                botUuid = player.settings.uuid;
                break;
              }
            }
            // for (const playerKey in this.players) {
            //   if (this.players.hasOwnProperty(playerKey)) {
            //     const player = this.players[playerKey];
            //     if (player.settings.name.indexOf(indexKey) !== -1) {
            //       botUuid = player.settings.uuid;
            //       break;
            //     }
            //   }
            // }

            await Promise.map(metajobPlayer.jobs, async(playerJob) => {
              let fileUuid;
              let jobUuid;
              // upload the file
              const jobFilePath = filePath.split(`.`)[0] + '/' + playerJob.filename;
              const fileStream = await fs.createReadStream(jobFilePath);
              const formData = { file: fileStream };
              const fileUrl = `http://localhost:${process.env.PORT}/v1/files`;

              const fileUploadParams = {
                method: `POST`,
                uri: fileUrl,
                formData,
                json: true,
              };
              let uploadFileReply;
              try {
                uploadFileReply = await request(fileUploadParams);
              } catch (ex) {
                self.logger.error('upload file error', ex);
              }
              fileUuid = uploadFileReply.data[0].uuid;
              // create the job
              const jobParams = {
                method: `POST`,
                uri: `http://localhost:${process.env.PORT}/v1/jobs`,
                body: {
                  uuid: playerJob.uuid,
                  botUuid,
                  fileUuid,
                },
                json: true,
              };
              let createJobReply;
              try {
                createJobReply = await request(jobParams);
              } catch (ex) {
                self.logger.error('create job error', ex);
              }
              jobUuid = createJobReply.data.uuid;
              // add the job to a list
              // the array order from metajob must be maintained
              playerJob.botUuid = botUuid;
              playerJob.state = this.app.context.jobs.jobList[jobUuid].fsm.current;
            }, { concurrency: 5 });
            this.players[botUuid].metajobQueue = metajobPlayer.jobs;
          }, { concurrency: 5 });
          resolve();
        });
      });
    } catch (ex) {
      this.logger.error(ex);
    }
  }

  // In order to start processing a job, the job's file is opened and then
  // processed one line at a time
  async startJob(job) {
    this.currentJob = job;
    await this.fsm.start();

    try {
      await this.uploadAndSetupPlayerJobs(job);
      this.logger.info('All files uploaded and set up');
      await this.scanForNextJob();
      this.updateInterval = setInterval(() => {
        this.scanForNextJob();
      }, 1000);
      this.logger.info('Players have begun');
      // then grab each player's first job
    } catch (ex) {
      this.logger.error(`Conductor failed to start job: ${ex}`);
    }

    await this.fsm.startDone();
  }

  async scanForNextJob() {
    for (const playerKey in this.players) {
      if (this.players.hasOwnProperty(playerKey)) {
        try {
          const player = this.players[playerKey];
          // check each player's first job. Queue it up.
          let noPrecursors = true;
          if (player.metajobQueue.length <= 0) {
            continue;
          }

          const currentJob = player.metajobQueue[0];
          if (currentJob === undefined ) {
            throw `First job in metajobQueue is undefined`;
          }
          // If the current job is still processing, let it go
          const jobObject = this.app.context.jobs.jobList[currentJob.uuid];
          if (this.app.context.jobs.jobList[currentJob.uuid].fsm.current !== `ready`) {
            this.logger.info(`1 Not starting a new job from state ${this.app.context.jobs.jobList[currentJob.uuid].fsm.current}`);
            continue;
          }

          // If the current bot is still doing something else, let it go
          const bot = this.app.context.bots.botList[currentJob.botUuid];
          // go through every precursor to the current job
          if (bot.fsm.current === `parked`) {
            bot.unpark(currentJob.x_entry, currentJob.dry);
            continue;
          }
          if (bot.fsm.current !== `connected`) {
            this.logger.info(`1 Not starting a new job when bot is in state ${bot.fsm.current}`);
            continue;
          }

          for (let i = 0; i < currentJob.precursors.length; i++) {
            const precursor = currentJob.precursors[i];
            const job = this.app.context.jobs.jobList[precursor];
            if (job === undefined) {
              throw `Error, the job ${precursor} is undefined`;
            }
            // flag noPrecursors if any of the jobs aren't complete yet
            if (job.fsm.current !== `complete`) {
              this.logger.info(`${currentJob.botUuid} job ${currentJob.uuid} won't start because job ${job.uuid} is ${job.fsm.current}`);
              noPrecursors = false;
            }
          }
          if (noPrecursors) {
            try {
              const jobToStart = this.app.context.jobs.jobList[currentJob.uuid];
              if (jobToStart === undefined) {
                throw `job ${currentJob.uuid} is undefined`;
              }
              await Promise.delay(100);
              await jobToStart.start();
              this.conductorLogger.info(`${bot.settings.botUuid}, Just started ${currentJob.uuid}`);
              // If the job starts without any issues
              // remove the first job from the list
              player.metajobQueue.shift();
            } catch (ex) {
              this.logger.error(`Job start fail`, ex);
            }
          } else {
            // Just sitting there in the ready position. park instead
            bot.park();
          }
        } catch (ex) {
          this.logger.error(`Checking player ${playerKey} error:`, ex);
        }
      }
    }
    this.checkIfDoneConducting();
  }

  async checkIfDoneConducting() {
    let doneConducting = true;
    for (const [playerKey, player] of Object.entries(this.metajobCopy)) {
      for (const job of player.jobs) {
        if (this.app.context.jobs.jobList[job.uuid].fsm.current !== `complete`) {
          doneConducting = false;
          break;
        }
      }
    }
    if (doneConducting) {
      await this.stopJob();
    }
  }

  async pauseJob() {
    if (this.fsm.current !== `connected`) { // TODO revisit this logic....
      try {
        await this.fsm.stop();
        // do the pause stuff here
        await this.fsm.stopDone();
      } catch (ex) {
        const errorMessage = `Conductor pause error ${ex}`;
        this.logger.error(errorMessage);
        await this.fsm.stopFail();
      }
    }
  }

  async resumeJob() {
    if (this.fsm.current !== `processingJob`) {
      await this.fsm.start();
      // do the resume stuff here
      await this.fsm.startDone();
    }
  }

  async stopJob() {
    if (this.fsm.current !== `connected`) {
      clearInterval(this.updateInterval);
      this.currentJob.percentComplete = 100;
      await this.fsm.stop();
      await this.fsm.stopDone();
      await this.currentJob.fsm.runningDone();
      await this.currentJob.stopwatch.stop();
    }
  }

  async connect() {
    this.fsm.connect();
    this.connectAllPlayers();
  }

  async disconnect() {
    try {
      this.fsm.disconnect();
      // Do disconnect stuff here...
      this.fsm.disconnectDone();
    } catch (ex) {
      this.fsm.disconnectFail();
    }
  }

/*******************************************************************************
 * Utility functions
 ******************************************************************************/
  async connectAllPlayers() {
   // Check if the players are all connected
   // If they are not, command them to connect
   // Keep checking on them until they are all connected
   const scanInterval = setInterval(async () => {
     let connected = true;
     // connect all local players
     for (const player in this.players) {
       if (this.players.hasOwnProperty(player)) {
         const uri = `http://localhost:${process.env.PORT}/v1/bots/${player}`
         // const uri = this.players[player].port;
         const requestParams = {
           method: `GET`,
           uri,
           json: true,
         };
         let res;
         try {
           res = await request(requestParams);
         } catch (ex) {
           res = false;
         }
         if (res.data && res.data.state && res.data.state === `connected`) {
           // this bot is connected
         } else {
           if (res.data && res.data.state && res.data.state === `ready`) {
             const connectParams = {
               method: `POST`,
               uri,
               body: {
                 command: `connect`,
               },
               json: true,
             };
             try {
               request(connectParams);
             } catch (ex) {
               this.logger.error(`Trying to connect to ${uri}`);
             }
           }
           connected = false;
         }
       }
     }
     if (connected) {
       clearInterval(scanInterval);
       await this.fsm.connectDone();
     }
   }, 1000);
  }
}

module.exports = Conductor;
