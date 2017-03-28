const fs = require('fs-promise');
const LineByLineReader = require('line-by-line');

const setupFileExecutor = async function setupFileExecutor(self) {
  const filesApp = self.app.context.files;
  const theFile = filesApp.getFile(self.currentJob.fileUuid);

  const lr = new LineByLineReader(theFile.filePath);
  self.currentLine = 0;
  lr.pause(); // redundant

  lr.on('error', (err) => {
    self.logger.error('line reader error:', err);
  });

  // As the buffer reads each line, process it
  lr.on('line', async (line) => {
    // pause the line reader immediately
    // we will resume it as soon as the line is done processing
    lr.pause();
    // We only care about the info prior to the first semicolon
    // NOTE This code is assuming we are processing GCODE
    // In case of adding support for multiple contrl formats, this is a good place to start

    let command = line.split(';')[0];
    if (command.length <= 0) {
      // If the line is blank, move on to the next line
      lr.resume();
    } else {
      command = self.addOffset(command);

      self.queue.queueCommands({
        code: command,
        postCallback: async () => {
          // Note, canceling a job will clear the current job value
          if (self.currentJob) {
            if (self.currentJob.fsm.current === 'running') {
              lr.resume();
            }
            self.currentLine += 1;
            self.currentJob.percentComplete = parseInt(self.currentLine / self.numLines * 100, 10);
          }
        },
      });
    }
  });

  lr.on('end', async () => {
    self.logger.info('completed reading file,', theFile.filePath, 'is closed now.');
    lr.close();
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
  });

  // Get the number of lines in the file
  let numLines = 0;
  const fsPromise = new Promise((resolve, reject) => {
    fs.createReadStream(theFile.filePath)
    .on('data', function readStreamOnData(chunk) {
      numLines += chunk
      .toString('utf8')
      .split(/\r\n|[\n\r\u0085\u2028\u2029]/g)
      .length - 1;
    })
    .on('end', () => {  // done
      self.numLines = numLines;
      self.logger.info(`Bot will process file with ${self.numLines} lines.`);
      resolve();
    });
  });

  await fsPromise;
  return lr;
};

module.exports = async function startJob(self, params) {
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
    self.currentJob = await jobMiddleware.createJob(botUuid, fileUuid);

    // set up the file executor
    self.currentJob.lr = await setupFileExecutor(self);
    self.currentJob.start();
    // Start consuming the file
    self.currentJob.lr.resume();
    self.fsm.startDone();
  } catch (ex) {
    self.logger.error('Start job fail', ex);
    self.fsm.startJobFail();
  }
  return self.getBot();
};
