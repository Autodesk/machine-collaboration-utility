const LineByLineReader = require('line-by-line');
const fs = require('fs');
const Promise = require('node-promise').Promise;
const DriverResponse = require('./driverResponse');
const DriverBase = require('./driverBase');
const Status = require('../status');
const logger = require('../../logger');
  // printerTypes = require('../../../spark-print-data/printertypes').printerTypes,
const CommandQueue = require('./commandQueue');

class GcodeClient extends DriverBase {
  constructor(inDeviceData, printerConfig) {
    super();
    this.setState(Status.State.DISCONNECTED);

    this.VID = inDeviceData.VID; // USB Vendor ID
    this.PID = inDeviceData.PID; // USB Product ID

    this.lr = undefined; // buffered file line reader
    this.mPercentComplete = 0;

    this.expandCode = printerConfig.expandCode;
    this.validateReply = printerConfig.validateReply;
    this.mStatus = new Status(this.getState());
    this.mStatusInProgress = undefined;
    this.mUpdater = undefined;
    this.mGetStatusCommands = printerConfig.getStatusCommands;
    this.mPauseCommands = printerConfig.pauseCommands;
    this.mResumeCommands = undefined;
    this.mCancelCommands = printerConfig.cancelCommands;
    this.mCompleteCommands = printerConfig.completeCommands;
    this.mParkCommands = printerConfig.parkCommands;
    this.mUnparkCommands = printerConfig.unparkCommands;

    // If true, maintain executor open after job completes
    this.mPersistentConnection = false;

    // milliseconds between retreiving printer status
    // set to -1 if not using
    this.mUpdateInterval = printerConfig.updateInterval;

    // a variable that holds the intended most recent gcode sent to each variable
    this.destination = {
      'E': 0,
      'F': 0,
      'X': 0,
      'Y': 0,
      'Z': 0,
      'T': 0,
      'B': 0,
      absolute: true,
    };

    this.mPrinterType = printerTypeHolder;
    // HACK!!! //TODO make printertypes load via settings
    // that.mPrinterType = _.find(
    //     printerTypes,
    //     function (inPrinterType) {
    //         return inPrinterType.id === inDeviceData.printerType;
    //     }
    // );

    this.mQueue = new CommandQueue(
      printerConfig.setupExecutor(inDeviceData),
      this.expandCode,
      this.validateReply
    );

    this.connected();
  }

  /**
   * loadmodel()
   *
   * Load a model asset so that it is prepared for streaming to printer
   *
   * Args:   inAsset - asset descriptor:
   *                   { type : 'file', path : '/foo/bar' }
   *                   { type : 'url' , url  : 'https://foo/bar' }
   * Return: DriverResponse
   */
  loadmodel(inAsset) {
    let response = DriverBase.prototype.loadmodel.call(this);
    if (!response.success) {
      return response;
    }
    console.log('loadmodel response!', response);
    if (!this.readyToLoadFile(inAsset)) {
      this.loadmodelCompleted(false); // aborted load
      return DriverResponse.Failure(
        this.getState(),
        DriverResponse.Errors.BAD_ASSET
      );
    }

    this.mPercentComplete = 0;


    if (this.mPersistentConnection) {
      this.loadFileReader(inAsset);
      this.setUpdateInterval();
    } else {
      // We open the connection during loadmodel instead of print
      // to handle printers that send the file directly to the printer
      this.mQueue.queueCommands({
        open: true,
        postCallback: () => {
          this.loadFileReader(inAsset);
          this.setUpdateInterval();
        },
      });
    }

    return DriverResponse.Success(this.getState());
  }

  /**
   * loadFileReader()
   *
   * Create a LineByLineReader to read each line of gcode
   *
   * Args:   inAsset - asset descriptor:
   *                   { type : 'file', path : '/foo/bar' }
   *                   { type : 'url' , url  : 'https://foo/bar' }
   */
  loadFileReader(inAsset) {
    this.lr = new LineByLineReader(inAsset.path);
    this.currentLine = 0;
    this.lr.pause(); // redundant

    this.lr.on('error', (err) => {
      logger.error('line reader error:', err);
    });

    // As the buffer reads each line, process it
    this.lr.on('line', (line) => {
      // pause the line reader immediately
      // we will resume it as soon as the line is done processing
      this.lr.pause();
      this.currentLine += 1;

      // We only care about the info prior to the first semicolon
      let strippedLine = line.split(';')[0];

      if (strippedLine.length <= 0) {
        // If the line is blank, move on to the next line
        this.lr.resume();
      } else {
        this.mQueue.queueCommands({
          code: strippedLine,
          postCallback: () => {
            this.mPercentComplete = parseInt(this.currentLine / this.numLines * 100);
            if (this.getState() === Status.State.PRINTING) {
              this.lr.resume();
            }
          },
        });
      }
    });

    this.lr.on('end', () => {
      logger.info('completed reading file,', inAsset.path, 'is closed now.');

      // Turn off the printer and put it into parked position
      this.mQueue.queueCommands(this.mCompleteCommands(this));

      // Handle the job becoming completed
      // Close the connection, clear the file buffer,
      // and call the job 100% done, complete
      if (this.mPersistentConnection) {
        this.mPercentComplete = 100;
        this.mQueue.clear();
        this.lr = undefined;
        this.printCompleted();
      } else {
        this.mQueue.queueCommands({
          // cleanup!!!
          close: true,
          postCallback: () => {
            this.mPercentComplete = 100;
            this.mQueue.clear();
            this.lr = undefined;
            this.printCompleted();
          },
        });
      }
    });

    // Get the number of lines in the file
    let numLines = 0;
    fs.createReadStream(inAsset.path)
    .on('data', function readStreamOnData(chunk) {
      numLines += chunk
      .toString('utf8')
      .split(/\r\n|[\n\r\u0085\u2028\u2029]/g)
      .length - 1;
    })
    .on('end', () => {  // done
      this.numLines = numLines;
      this.loadmodelCompleted(true);
    });
  }

  /**
   * readyToLoadFile()
   *
   * Loading requires a closed connection and an existing file
   *
   * Args:   inAsset - asset descriptor:
   *                   { type : 'file', path : '/foo/bar' }
   *                   { type : 'url' , url  : 'https://foo/bar' }
   * Return: true if we can load the file
   */
  readyToLoadFile(inAsset) {
    let ready = false;

    if (!this.mQueue.isOpen() || this.mPersistentConnection) {
      try {
        let stat = fs.statSync(inAsset.path);
        if (stat.isFile()) {
          ready = true;
        } else {
          logger.warn('Asset is not a file:', inAsset);
        }
      } catch (ex) {
        logger.warn('SerialPrinter.loadmodel bad asset', inAsset, ex);
      }
    } else {
      logger.warn('GcodeClient.loadmodel requires a closed connection');
    }

    return ready;
  }

  /**
   * print()
   *
   * Start streaming gcode to the queue
   *
   * Args:   N/A
   * Return: DriverResponse
   */
  print() {
    let response = DriverBase.prototype.print.call(this);
    if (!response.success) {
      return response;
    }

    this.mPercentComplete = 0;

    if (this.lr === undefined) {
      return DriverResponse.Failure(this.getState(), DriverResponse.Errors.MODEL_NOT_LOADED);
    }

    // Connection should already be open
    if (!this.mQueue.isOpen()) {
      return DriverResponse.Failure(this.getState(), DriverResponse.Errors.BAD_STATE);
    }

    this.lr.resume();

    response = DriverResponse.Success(this.getState());
    return response;
  }

  pause() {
    console.log('pause command request!');
    // Bail out if we are already paused or on superclass failure
    if (this.getState() === Status.State.PAUSED) {
      return DriverResponse.Success(this.getState());
    }

    var response = DriverBase.prototype.pause.call(this);
    if (!response.success) {
      return response;
    }

    // Get the extruder out of the way and retract a bit of fillament
    console.log('just queued the pause commands');
    this.mQueue.queueCommands(this.mPauseCommands(this));
    return response;
  }

  resume() {
    // Bail out if we are already resume or on superclass failure
    if (this.getState() === Status.State.PRINTING) {
      return DriverResponse.Success(this.getState());
    }
    let response = DriverBase.prototype.resume.call(this);
    if (!response.success) {
      return response;
    }

    if (this.mResumeCommands !== undefined) {
      this.mQueue.queueCommands(this.mResumeCommands);
      this.mQueue.queueCommands({
        code: '',
        postCallback: () => {
          this.mResumeCommands = undefined;
        },
      });
    }
    this.mQueue.resume();
    this.lr.resume();
    return response;
  }

  cancel() {
    let response = DriverBase.prototype.cancel.call(this);

    if (!response.success) {
      return response;
    }

    this.clearUpdateInterval();

    this.mQueue.clear();
    this.mQueue.queueCommands(this.mCancelCommands(this));
    if (this.mPersistentConnection) {
      this.mQueue.queueCommands({
        code: '',
        postCallback: () => {
          this.mStatus = new Status(this.getState());
          this.mStatusInProgress = undefined;
        },
      });
    } else {
      this.mQueue.queueCommands({
        close: true,
        postCallback: () => {
          this.mStatus = new Status(this.getState());
          this.mStatusInProgress = undefined;
        },
      });
    }
    return DriverResponse.Success(this.getState());
  }

  // A recurring command that updates the printer's status object
  updateStatus() {
    if (this.mStatusInProgress === undefined) {
      this.mStatusInProgress = new Status(this.getState());
      this.mQueue.queueCommands(this.mGetStatusCommands(this));
      this.mQueue.queueCommands({
        postCallback: () => {
          if (
            this.mStatusInProgress.state === Status.State.PRINTING ||
            this.mStatusInProgress.state === Status.State.PAUSED
          ) {
            this.mStatusInProgress.job = {};
            this.mStatusInProgress.job.percentComplete = this.mPercentComplete;
          }
          this.mStatusInProgress.position = this.destination;
          this.mStatus = this.mStatusInProgress;
          this.mStatusInProgress = undefined;
          if (this.mStatusPromise) {
            this.mStatusPromise.resolve(this.mStatus);
            this.mStatusPromise = undefined;
          }
        },
      });
    }
  }

  setUpdateInterval() {
    if (
      this.mUpdater === undefined &&
      typeof(this.mUpdateInterval) === 'number' &&
      this.mUpdateInterval > 0
    ) {
      this.mUpdater = setInterval(() => {
        this.updateStatus();
      }, this.mUpdateInterval);
    }
  }

  clearUpdateInterval() {
    if (this.mUpdater) {
      clearInterval(this.mUpdater);
      this.mUpdater = undefined;
    }
  }

  getStatus() {
    let status = new Status(this.getState());
    status.position = this.destination;

    switch (status.state) {
    case Status.State.PRINTING:
    case Status.State.PAUSED:
      this.mStatus.state = status.state;
      // If the job is complete
      if (this.mPercentComplete >= 100) {
        status.job = {};
        status.job.percentComplete = this.mPercentComplete;
        this.clearUpdateInterval();
        // reset the status and the status in progress
        // return a sanitized 100% complete status
        this.mStatusInProgress = undefined;
        this.mStatus = new Status(this.getState());
        this.mStatus.position = this.destination;
        return status;
      }

      // If we aren't constantly checking for the status then create a promise
      // and return the status once it's done processing
      if (
        this.mUpdater === undefined && (this.mUpdateInterval === -1 || this.mUpdateInterval === undefined)
      ) {
        if (this.mStatusPromise === undefined) {
          this.mStatusPromise = new Promise();
          this.updateStatus();
        }
        return this.mStatusPromise;
      // Otherwise, just give them the most recent status
      }
      return this.mStatus;
    case Status.State.CONNECTED:
      return this.mStatus;
    default:
      return new Status(this.getState());
    }
  }

  connectExecutor() {
    let connectPromise = new Promise();
    if (this.mQueue.isOpen()) {
      connectPromise.resolve(true);
    } else {
      this.mQueue.queueCommands({
        open: true,
        postCallback: () => {
          this.mPersistentConnection = true;
          this.setState(Status.State.CONNECTED);

          // Once the connection is open, make it poll the printer's status
          this.setUpdateInterval();
          connectPromise.resolve(true);
        },
      });
    }
    return connectPromise;
  }

  disconnectExecutor() {
    let disconnectPromise = new Promise();
    this.clearUpdateInterval();
    if (!this.mQueue.isOpen()) {
      disconnectPromise.resolve(true);
    } else {
      this.mQueue.clear();

      this.mQueue.queueCommands({
        close: true,
        postCallback: () => {
          this.mPersistentConnection = false;
          this.setState(Status.State.READY);
          disconnectPromise.resolve(true);
        },
      });
    }
    return disconnectPromise;
  }

  jogPrinter(params) {
    const axis = params.axis;
    const amount = Number(params.amount);
    let jogReply = new Promise();
    if (this.mQueue.isOpen()) {
      const state = this.getState();
      let newDestination;
      if (
        state === Status.State.PRINTING ||
        state === Status.State.PAUSED ||
        state === Status.State.CONNECTED
      ) {
        this.mQueue.prependCommands([
          {
            code: 'M114',
            processData: (inCommand, inReply) => {
              console.log('jog printer paused or connected M114 reply', inReply);
              newDestination = {
                'X': {
                  amount: Number(inReply.split('X:')[1].split('Y:')[0]),
                  speed: 2500,
                },
                'Y': {
                  amount: Number(inReply.split('Y:')[1].split('Z:')[0]),
                  speed: 2500,
                },
                'Z': {
                  amount: Number(inReply.split('Z:')[1].split('E:')[0]),
                  speed: 1000,
                },
                'E': {
                  amount: Number(inReply.split('E:')[1].split(' Count')[0]),
                  speed: 1000,
                },
              };

              this.mQueue.prependCommands([
                'G92 ' + axis + (newDestination[axis].amount - amount),
                {
                  code: 'G1 ' + axis + (newDestination[axis].amount) + ' F' + newDestination[axis].speed,
                  processData: () => {
                    jogReply.resolve({'Success': 'Printer jogged'});
                    return true;
                  },
                },
              ]);

              return true;
            },
          },
        ]);
      } else {
        jogReply.resolve({'Error': 'Unsupported jog state: ' + state});
      }
    } else {
      jogReply.resolve({'Error': 'Printer is not connected'});
    }

    return jogReply;
  }

  sendGcode(params) {
    let gcodeReply = new Promise();
    if (this.mQueue.isOpen()) {
      const state = this.getState();
      let commandArray = [];
      if (typeof params.gcode === 'string') {
        commandArray.push({
          code: params.gcode,
          processData: (inCommand, inReply) => {
            gcodeReply.resolve({'Reply': inReply});
            return true;
          },
        });
      } else {
        let reply = '';
        for (let command in params.gcode) {
          commandArray.push({
            code: params.gcode[command],
            processData: (inCommand, inReply) => {
              reply += inReply + '\n';
              if (command === params.gcode.length - 1) {
                gcodeReply.resolve({'Reply': reply});
              }
              return true;
            }
          });
        }
      }
      if (this.getState() === Status.State.PAUSED) {
        this.mQueue.prependCommands(commandArray);
      } else {
        this.mQueue.queueCommands(commandArray);
      }
    } else {
      gcodeReply.resolve({'Error': 'Printer is not connected'});
    }
    return gcodeReply;
  }

  unpark(params){
    logger.info('Unparking ', params);

    const x_entry = params.x_entry;
    const dry = params.dry;
    this.mQueue.queueCommands(this.mUnparkCommands(this, x_entry, dry));

  }


  park(params){
    logger.info('Parking ', params);
    this.mQueue.queueCommands(this.mParkCommands(this));
  }

  ////   HELPER FUNCTIONS  ////

  /**
   * getParkCommand()
   *
   * Look up our park position and generate the Gcode to move to it
   */
  getParkCommand(inData) {
    let buildVolume;
    let parkPosition;
    let x;
    let y;
    let z;
    let parkCommand;

    // Find the current Z position and park 1mm above it
    // TODO limit the Z position to be less than or equal to the maximum Z
    let regEx = /^X:(\d+\.\d+)Y:(\d+\.\d+)Z:(\d+\.\d+).*$/;
    let currentZ = (Number(inData.replace(regEx, '$3')) + 1) / 10;
    buildVolume = this.mPrinterType && this.mPrinterType.buildVolume;
    if (buildVolume) {
      parkPosition = buildVolume.parkPosition;
      if (parkPosition) {
        x = parkPosition[0];
        y = parkPosition[1];
        z = currentZ; // parkPosition[2];
        parkCommand = 'G1 X' + x * 10 + ' Y' + y * 10 + ' Z' + z * 10 + ' F4000';
      }
    }
    return parkCommand;
  }

  /**
   * parseExtrudeLength()
   *
   * Parse the output of the M114 command to get our current extrusion
   * length
   *
   * Args:   inData - response of the M114 command
   * Return: extrusion length (in float form)
   */
  parseExtrudeLength(inData) {
    let length = inData.replace(/.*E:(-?\d+\.\d+).*/, '$1');
    return length;
  }

  /**
   * parseCurrentPosition()
   *
   * Parse the output of the M114 command to get our current position.
   * It is of the form:
   *
   * Args:   inData - response of the M114 command
   * Return: current postion in the form: "X<x> Y<y> Z<z>"
   */
  parseCurrentPosition(inData) {
    let regEx = /^X:(\d+\.\d+)Y:(\d+\.\d+)Z:(\d+\.\d+).*$/;
    let curPos = inData.replace(regEx, 'X$1 Y$2 Z$3');
    return curPos;
  }

}

module.exports = GcodeClient;
