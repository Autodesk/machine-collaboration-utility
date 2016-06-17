const router = require(`koa-router`)();
const Promise = require(`bluebird`);
const StateMachine = Promise.promisifyAll(require(`javascript-state-machine`));

const request = require(`request-promise`);
const unzip = require(`unzip2`);
const fs = require(`fs`);
const _ = require(`underscore`);

const conductorRoutes = require(`./routes`);
const Bot = require(`../bots/bot`);

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
          this.app.io.emit(`stateChange`, to);
          this.logger.info(`Conductor event ${event}: Transitioning from ${from} to ${to}.`);
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
        let endpoint;
        const botModel = this.app.context.config.conductor.botModel;
        const botName = `${botModel}-${playerX}-${playerY}`;
        switch (botModel) {
          case `http`:
            endpoint = `http://${botName}.local:9000/v1/bots/solo`;
            break;
          case `Virtual`:
            const sanitizedId = this.app.context.bots.sanitizeStringForRouting(botName);
            endpoint = `http://localhost:${process.env.PORT}/v1/bots/${sanitizedId}`;
            break;
          default:
            endpoint = `http://${botName}.local:9000/v1/bots/solo`;
        }
        const bots = this.app.context.bots.getBots();
        let unique = true;
        for (const bot in bots) {
          if (bots.hasOwnProperty(bot)) {
            if (bots[bot].botId === endpoint) {
              this.players[botName] = Object.assign({}, bots[bot]);
              unique = false;
              break;
            }
          }
        }

        // If a bot doesn't exist yet with that endpoint, create it
        if (unique) {
          const newBot = await this.app.context.bots.createBot(
            {
              botId: endpoint,
              name: `${botModel}-${playerX}-${playerY}`,
              model: this.app.context.config.conductor.botModel,
            }
          );
          this.players[endpoint] = newBot;
        }
      }
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
      }
    }
    return players;
  }

  handleBotUpdates(botId, jobUuid) {
    console.log('heres an update. doooo something!', botId, jobUuid);
  }

  // In order to start processing a job, the job's file is opened and then
  // processed one line at a time
  async startJob(job) {
    const self = this;

    self.currentJob = job;
    await self.fsm.start();
    const filesApp = self.app.context.files;
    const theFile = filesApp.getFile(job.fileUuid);
    const filePath = filesApp.getFilePath(theFile);
    try {
      fs.createReadStream(filePath)
      .pipe(unzip.Extract({ path: filePath.split(`.`)[0] }))
      .on(`close`, async () => {
        this.metajob = require(filePath.split(`.`)[0] + `/metajob.json`);
        const playerArray = _.toArray(this.metajob);
        Promise.map(playerArray, (player) => {
          Promise.map(player.jobs, async(playerJob) => {
            let fileUuid;
            let jobUuid;
            // upload the file
            const jobFilePath = filePath.split(`.`)[0] + '/' + playerJob.filename;
            const fileStream = await fs.createReadStream(jobFilePath);
            const formData = { file: fileStream };
            const fileUploadParams = {
              method: `POST`,
              uri: `http://${player.location}/v1/files`,
              formData,
              json: true,
            };
            const uploadFileReply = await request(fileUploadParams);
            fileUuid = uploadFileReply.data[0].uuid;

            // create the job
            const jobParams = {
              method: `POST`,
              uri: `http://${player.location}/v1/jobs`,
              body: {
                botId: `usb`,
              },
              json: true,
            };
            const createJobReply = await request(jobParams);
            jobUuid = createJobReply.data.uuid;

            // link the file to the job
            const linkFileToJobParams = {
              method: `POST`,
              uri: `http://${player.location}/v1/jobs/${jobUuid}/setFile`,
              body: {
                fileUuid,
              },
              json: true,
            };
            await request(linkFileToJobParams);
          }, { concurrency: 5 });
        }, { concurrency: 5 });
      });
    } catch (ex) {
      this.logger.error(new Error(ex));
    }
    await self.fsm.startDone();
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
      await this.fsm.stop();
      // do the stop stuff here
      await this.fsm.stopDone();
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
         const uri = this.players[player].port;
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
             request(connectParams);
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
