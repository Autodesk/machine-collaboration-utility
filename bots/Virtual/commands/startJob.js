const fs = require('fs-promise');
const LineByLineReader = require('line-by-line');
const gcodeToObject = require('gcode-json-converter').gcodeToObject;
const objectToGcode = require('gcode-json-converter').objectToGcode;
const _ = require('lodash');
const Promise = require('bluebird');

async function checkPrecursors(self, params) {
  if (
    self.status.blocker !== undefined &&
    self.status.blocker.bot !== undefined &&
    self.status.blocker.checkpoint !== undefined
  ) {
    self.logger.info('Checking precursors for bot', self.getBot());
    const blockingBotCurrentCheckpoint = self.status.collaborators[self.status.blocker.bot];
    // If the precursor is complete then move on
    if (blockingBotCurrentCheckpoint > self.status.blocker.checkpoint) {
      self.status.blocker = undefined;
      self.lr.resume();
    } else {
      // If the precursor is not complete, then park
      self.queue.queueCommands({
        postCallback: () => {
          if (self.fsm.current === 'executingJob') {
            self.commands.park(self);
          } else {
            self.logger.error(`Cannot park from state "${self.fsm.current}"`);
          }
        },
      });
    }
  }
}


async function processCommentTag(gcodeObject, self) {
  switch(gcodeObject.metaComment.command) {
    case 'forcePark': {}
    case 'park': {
      self.commands.park(self);
      break;
    }
    case 'unpark': {
      self.commands.unpark(self);
      break;
    }
    case 'checkpoint': {
      _.entries(gcodeObject.metaComment.args).forEach(([bot, checkpoint]) => {
        self.status.checkpoint = parseInt(checkpoint);
        self.logger.info(`Bot ${bot} just reached checkpoint ${checkpoint}`);
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
          console.log('updating!');
          await request(updateParams)
          .catch((error) => {
            self.logger.error('Conductor update fail', ex);
          });
        });
      }

      self.lr.resume();

      // Let conductor know that you've reached the latest checkpoint
      // Check if precursors are complete
      break;
    }
    case 'precursor': {
      // Assuming that there's only one precursor per line
      const bot = Object.keys(gcodeObject.metaComment.args)[0];
      const checkpoint = parseInt(gcodeObject.metaComment.args[bot]);
      self.status.blocker = { bot, checkpoint };
      self.logger.info(`Just set blocker to bot ${bot}, checkpoint ${checkpoint}`);
      checkPrecursors(self);
      break;
    }
    case 'dry': {
      const dry = gcodeObject.metaComment.args.dry;

      // If the printer is currently parked, then purge and unpark it
      self.queue.queueCommands([
        'M400',
        {
          postCallback: () => {
            if (self.fsm.current === 'parked') {
              // should start unparking and then resume reading lines
              self.commands.unpark(self, { dry });
            }
          },
        },
        {
          postCallback: () => {
            self.lr.resume();
          },
        },
      ]);
      console.log('just queued dry commands', gcodeObject, self.fsm.current);
      break;
    }
    default: {
      self.logger.error('Unknown comment', conductorCommentResult);
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
  if (gcodeObject.metaComment.command) {
    await processCommentTag(gcodeObject, self);
    // Process the metaComment
  } else if (gcodeObject.command == undefined && Object.keys(gcodeObject.args).length === 0) {
    // If the command is blank, move on to the next line
    self.lr.resume();
  } else {
    self.addOffset(gcodeObject);

    self.queue.queueCommands({
      code: objectToGcode(gcodeObject, { comment: false }),
      postCallback: async () => {
        // Note, canceling a job will clear the current job value
        if (self.currentJob) {
          if (self.currentJob.fsm.current === 'running') {
            self.lr.resume();
          }
          self.currentLine += 1;
          self.currentJob.percentComplete = parseInt(self.currentLine / self.numLines * 100, 10);
        }
      },
    });
  }
}

async function processFileEnd(self) {
  self.logger.info('Completed reading file,', theFile.filePath, 'is closed now.');
  self.lr.close();
  self.queue.queueCommands({
    postCallback: async () => {
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
  return new Promise((resolve, reject) => {
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
    self.logger.error('line reader error:', error);
  });

  // As the buffer reads each line, process it
  self.lr.on('line', (line) => {
    processLine(line, self);
  });

  self.lr.on('end', () => {
    processFileEnd(self);
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
      throw new Error(`Bot should not currently have a job associated with it.`);
    }
    if (params.fileUuid === undefined) {
      throw new Error('A "fileUuid" must be specified when starting a job.');
    }
    self.fsm.startJob();

    // Create a job
    const jobMiddleware = self.app.context.jobs;
    const botUuid = self.settings.uuid;
    const fileUuid = params.fileUuid;
    self.currentJob = await jobMiddleware.createJob(botUuid, fileUuid)
    .catch(error => {
      throw new Error('Create job error', error);
    });

    // set up the file executor
    await setupFileExecutor(self)
    .catch(error => {
      throw new Error('Setup file executor error', error);
    });

    self.currentJob.start();

    // Start consuming the file
    self.lr.resume();

    self.fsm.startDone();
  } catch (ex) {
    self.logger.error('Start job fail', ex);
    self.fsm.startJobFail();
  }
  return self.getBot();
};
