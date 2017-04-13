const path = require('path');
const botFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Bots/botFsmDefinitions'));
const jobFsmDefinitions = require(path.join(process.env.PWD, 'react/modules/Jobs/jobFsmDefinitions'));

module.exports = async function pause(self, params) {
  try {
    if (self.currentJob === undefined) {
      throw new Error(`Bot ${self.settings.name} is not currently processing a job`);
    }
    if (!botFsmDefinitions.metaStates.pauseable.includes(self.fsm.current)) {
      throw new Error(`Cannot pause bot from state "${self.fsm.current}"`);
    }
    if (self.currentJob.fsm.current !== 'running') {
      throw new Error(`Cannot pause job from state "${self.currentJob.fsm.current}"`);
    }

    // We want pause to happen in a very specific order
    // 1. Start pause from the state machine immediately
    // 2. Allow for pause movements / macros / etc
    // 3. Complete state machine pause transition by signaling that pause is complete
    //
    // In order to accomplish this, we must prepend the current commands in the queue
    // We prepend 1
    // We call the state machine command "pause"
    // In the postCallback of 1, we prepend 2 to the queue
    // Then in the postCallback of 2, we prepend 3 to the queue
    //
    // This comes across a bit backwards, but the ordering is necessary in order to prevent
    // transitioning to an incorrect state
    const commandArray = [];

    const pauseEndCommand = {
      postCallback: () => {
        self.fsm.pauseDone();
      },
    };

    const m114Regex = /.*X:([+-]?\d+(\.\d+)?)\s*Y:([+-]?\d+(\.\d+)?)\s*Z:([+-]?\d+(\.\d+)?)\s*E:([+-]?\d+(\.\d+)?).*/;
    const pauseMovementCommand = {
      code: 'M400',
      postCallback: () => {
        self.queue.prependCommands({
          // When pausing capture the position so that we can come back to it
          preCallback: () => {
            self.logger.debug('Starting pause movements');
          },
          code: 'M114',
          processData: (command, data) => {
            const parsedPosition = data.match(m114Regex);
            self.pausedPosition = {
              x: Number(parsedPosition[1]),
              y: Number(parsedPosition[3]),
              z: Number(parsedPosition[5]),
              e: Number(parsedPosition[7])
            }
            return true;
          },
          postCallback: () => {
            const yPark = -50;
            const parkArray = [];
            if (self.pausedPosition.z < 500) {
              parkArray.push(`G1 Z${self.pausedPosition.z + 10}`);
            }
            if (self.pausedPosition.y > self.settings.offsetY) {
              parkArray.push('G1 Y' + self.settings.offsetY.toFixed(2) + ' F10000'); // Scrub
            }
            parkArray.push('G1 Y' + (yPark + Number(self.settings.offsetY)).toFixed(2) + ' F2000'); // Drag Y across the purge
            parkArray.push('M400');
            parkArray.push({
              postCallback: () => {
                self.parked = true;
                self.queue.prependCommands(pauseEndCommand);
              }
            });
            self.queue.prependCommands(parkArray);
          }
        });
      }
    };

    // Pause the job
    commandArray.push({
      postCallback: () => {
        self.logger.debug('Starting pause command');
        // This line of code is not being reached.
        self.currentJob.pause();
        // Note, we don't return the pause request until the initial pause command is processed by the queue
        self.queue.prependCommands(pauseMovementCommand);
      },
    });

    if (self.fsm.current === 'blocking' || self.fsm.current === 'unblocking') {
      commandArray.unshift({
        postCallback: () => {
          self.logger.debug('Just queued pause', self.getBot().settings.name, self.fsm.current);
          self.pauseableState = self.fsm.current;
          self.fsm.pause();
        }
      });
      self.queue.queueCommands(commandArray);
    } else {
      self.queue.prependCommands(commandArray);
      self.logger.debug('Just queued pause', self.getBot().settings.name, self.fsm.current);
      self.pauseableState = self.fsm.current;
      self.fsm.pause();
    }
  } catch (ex) {
    self.logger.error('Pause error', ex);
  }

  return self.getBot();
};
