/* global logger */
const fs = require('fs-promise');
const LineByLineReader = require('line-by-line');
const gcodeToObject = require('gcode-json-converter').gcodeToObject;
const objectToGcode = require('gcode-json-converter').objectToGcode;
const _ = require('lodash');
const request = require('request-promise');

async function processCommentTag(gcodeObject, self) {
  switch (gcodeObject.commentTag.command) {
    case 'pause': {
    case 'forcePark': {
      self.parked = true;
      self.lr.resume();
      break;
    }
    case 'block': {
      self.commands.block(self);
      break;
    }
    case 'unblock': {
      self.commands.unblock(self);
      break;
    }
    case 'checkpoint': {
      _.entries(gcodeObject.commentTag.args).forEach(([bot, checkpoint]) => {
        self.status.checkpoint = parseInt(checkpoint, 10);
        logger.info(`Bot ${bot} just reached checkpoint ${checkpoint}`);
      });

      if (Array.isArray(self.currentJob.subscribers)) {
        await Promise.map(self.currentJob.subscribers, async (subscriber) => {
          const updateParams = {
            method: 'POST',
            uri: subscriber,
            body: {
              command: 'updateCollaborativeBotCheckpoint',
              bot: self.settings.name,
              checkpoint: self.status.checkpoint,
            },
            json: true,
          };

          await request(updateParams)
          .catch((error) => { logger.error('Conductor update fail', error); });
        });
      }

      if (self.fsm.current === 'executingJob') {
        self.lr.resume();
      }

      // Let conductor know that you've reached the latest checkpoint
      // Check if precursors are complete
      break;
    }
    case 'precursor': {
      // Assuming that there's only one precursor per line
      const bot = Object.keys(gcodeObject.commentTag.args)[0];
      const checkpoint = parseInt(gcodeObject.commentTag.args[bot], 10);
      self.status.blocker = { bot, checkpoint };
      logger.info(`Just set blocker to bot ${bot}, checkpoint ${checkpoint}`);
      self.commands.checkPrecursors(self);
      break;
    }
    case 'dry': {
      const dry = gcodeObject.commentTag.args.dry;
      logger.debug(`About to purge: ${dry} ${typeof dry} `);

      // If the printer is currently blocked, then purge and unblock it
      self.queue.queueSequentialCommands([
        self.info.clearBufferCommand,
        {
          postCallback: () => {
            self.commands.unblock(self, { dry });
          },
        },
      ]);
      break;
    }
    default: {
      self.lr.resume();
      logger.error('Unknown comment', gcodeObject.commentTag.command);
      break;
    }
  }
}

async function processLine(line, self) {
  // pause the line reader immediately
  // we will resume it as soon as the line is done processing
  self.lr.pause();

  // We only care about the info prior to the first semicolon
  // NOTE This code is assuming we are processing GCODE

  const gcodeObject = gcodeToObject(line, self);

  // NOTE Currently not processing any information in from of a comment tag
  if (gcodeObject.commentTag.command) {
    await processCommentTag(gcodeObject, self);
    // Process the commentTag
  } else if (gcodeObject.command == undefined && Object.keys(gcodeObject.args).length === 0) {
    // If the command is blank, move on to the next line
    if (self.fsm.current === 'executingJob') {
      self.lr.resume();
    }
  } else {
    self.addOffset(gcodeObject);

    self.queue.queueCommands({
      code: objectToGcode(gcodeObject, { comment: false }),
      postCallback: () => {
        // Note, canceling a job will clear the current job value
        if (self.currentJob) {
          self.currentLine += 1;
          // Once the file is done, make sure that we still read only 99% until the bot is done processing the file
          const percentComplete = parseInt(self.currentLine / self.numLines * 100, 10) >= 100 ? 99 : parseInt(self.currentLine / self.numLines * 100, 10);
          self.currentJob.percentComplete = percentComplete;

          if (self.fsm.current === 'executingJob') {
            self.lr.resume();
          }
        }
      },
    });
  }
}

async function processFileEnd(self, theFile) {
  logger.info('Completed reading file,', theFile.filePath, 'is closed now.');
  self.lr.close();
  self.queue.queueCommands({
    code: self.info.clearBufferCommand,
    postCallback: () => {
      self.currentJob.percentComplete = 100;
      self.fsm.complete();
      self.currentJob.complete();
      self.currentJob = undefined;
      // Could do some sort of completion routine here
      self.fsm.completeDone();
      setTimeout(() => {
        self.app.io.broadcast('botEvent', {
          uuid: self.settings.uuid,
          event: 'update',
          data: self.getBot(),
        });
      }, 2000);
    },
  });
}

function getNLinesInFile(theFile) {
  // Get the number of lines in the file
  let numLines = 0;
  return new Promise((resolve) => {
    fs.createReadStream(theFile.filePath)
    .on('data', function readStreamOnData(chunk) {
      numLines += chunk
      .toString('utf8')
      .split(/\r\n|[\n\r\u0085\u2028\u2029]/g)
      .length - 1;
    })
    .on('end', () => {  // done
      resolve(numLines);
    });
  });
}

// Need to return a line-by-line reader object
const setupFileExecutor = async function setupFileExecutor(self) {
  const filesApp = self.app.context.files;
  const theFile = filesApp.getFile(self.currentJob.fileUuid);

  self.lr = new LineByLineReader(theFile.filePath);
  self.currentLine = 0;
  self.lr.pause(); // redundant

  self.lr.on('error', (error) => {
    logger.error('line reader error:', error);
  });

  // As the buffer reads each line, process it
  self.lr.on('line', (line) => {
    processLine(line, self);
  });

  self.lr.on('end', () => {
    processFileEnd(self, theFile);
  });

  self.numLines = await getNLinesInFile(theFile)
  .catch((error) => {
    throw new Error('Read N lines error', error);
  });
};

module.exports = async function startJob(self, params) {
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
    if (self.warnings.length > 0) {
      throw new Error('Cannot start job with unresolved warnings', self.warnings);
    }

    self.fsm.startJob();
    try {
      // Create a job
      const jobMiddleware = self.app.context.jobs;
      const botUuid = self.settings.uuid;
      const fileUuid = params.fileUuid;
      const subscribers = params.subscribers;

      self.currentJob = await jobMiddleware.createJob(botUuid, fileUuid, null, subscribers)
      .catch((error) => { throw new Error('Create job error', error); });

      // set up the file executor
      await setupFileExecutor(self)
      .catch((error) => { throw new Error('Setup file executor error', error); });

      self.currentJob.start();

      // Start consuming the file
      self.lr.resume();

      self.fsm.startDone();
    } catch (ex) {
      self.fsm.startJobFail();
    }
  } catch (ex) {
    logger.error('Start job fail', ex);
    throw ex;
  }
  return self.getBot();
};
