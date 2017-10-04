const pauseable = [
  'executingJob',
  'blocking',
  'blocked',
  'unblocking',
];

const processingJob = [
  'startingJob',
  'pausing',
  'paused',
  'resuming',
  ...pauseable,
];

const connected = [
  'idle',
  'completingJob',
  'cancelingJob',
  ...processingJob,
];

const available = [
  'ready',
  'connecting',
  'disconnecting',
  'error',
  ...connected,
];

const fsmEvents = [
  /* eslint-disable no-multi-spaces */
  // BOT events
  { from: 'uninitialized',       to: 'initializing',        name: 'discover'                      },
  { from: 'initializing',        to: 'uninitialized',       name: 'initializationFail'            },
  { from: 'initializing',        to: 'uninitialized',       name: 'unplug'                        },
  { from: 'initializing',        to: 'ready',               name: 'initializationDone'            },

  // AVAILABLE events
  { from: 'ready',               to: 'connecting',          name: 'connect'                       },
  { from: 'connecting',          to: 'idle',                name: 'connectDone'                   },
  { from: 'connecting',          to: 'error',               name: 'connectFail'                   },
  { from: 'disconnecting',       to: 'ready',               name: 'disconnectDone'                },
  { from: 'disconnecting',       to: 'error',               name: 'disconnectFail'                },

  // CONNECTED events
  { from: 'idle',                to: 'startingJob',         name: 'startJob'                      },
  { from: 'completingJob',       to: 'idle',                name: 'completeDone'                  },
  { from: 'cancelingJob',        to: 'idle',                name: 'cancelDone'                    },

  // PROCESSING JOB events
  { from: 'startingJob',         to: 'executingJob',        name: 'startDone'                     },
  { from: 'startingJob',         to: 'idle',                name: 'startJobFail'                  },
  { from: 'pausing',             to: 'paused',              name: 'pauseDone'                     },
  { from: 'paused',              to: 'resuming',            name: 'resume'                        },
  { from: 'resuming',            to: 'executingJob',        name: 'resumeExecutingJob'            },
  { from: 'resuming',            to: 'blocking',            name: 'resumeBlocking'                },
  { from: 'resuming',            to: 'blocked',             name: 'resumeBlocked'                 },
  { from: 'resuming',            to: 'unblocking',          name: 'resumeUnblocking'              },

  // PAUSEABLE events
  { from: 'executingJob',        to: 'blocking',            name: 'block'                         },
  { from: 'executingJob',        to: 'completingJob',       name: 'complete'                      },
  { from: 'blocking',             to: 'blocked',            name: 'blockDone'                     },
  { from: 'blocked',              to: 'unblocking',         name: 'unblock'                       },
  { from: 'unblocking',           to: 'executingJob',       name: 'unblockDone'                   },

  // META STATE events
  { from: available,             to: 'initializing',        name: 'reset'                         },
  { from: available,             to: 'uninitialized',       name: 'unplug'                        },
  { from: connected,             to: 'disconnecting',       name: 'disconnect'                    },
  { from: connected,             to: 'error',               name: 'connectedError'                },
  { from: processingJob,         to: 'cancelingJob',        name: 'cancel'                        },
  { from: pauseable,             to: 'pausing',             name: 'pause'                         },

  /* eslint-enable no-multi-spaces */
];

module.exports = {
  metaStates: {
    pauseable,
    processingJob,
    connected,
    available,
  },
  fsmEvents,
};
