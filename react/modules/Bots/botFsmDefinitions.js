const processingJob = [
  'startingJob',
  'executingJob',
  'pausing',
  'paused',
  'resuming',
  'parking',
  'parked',
  'unparking',
];

const connected = [
  'idle',
  'completingJob',
  'cancelingJob',
  'handlingIdleWarning',
  'handlingJobWarning',
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
  { from: 'uninitialized',       to: 'initializing',        name: 'discover'           },
  { from: 'initializing',        to: 'uninitialized',       name: 'initializationFail' },
  { from: 'initializing',        to: 'ready',               name: 'initializationDone' },

  // AVAILABLE events
  { from: 'ready',               to: 'connecting',          name: 'connect'            },
  { from: 'connecting',          to: 'idle',                name: 'connectDone'        },
  { from: 'connecting',          to: 'error',               name: 'connectFail'        },
  { from: 'disconnecting',       to: 'ready',               name: 'disconnectDone'     },
  { from: 'disconnecting',       to: 'error',               name: 'disconnectFail'     },

  // CONNECTED events
  { from: 'idle',                to: 'startingJob',         name: 'startJob'           },
  { from: 'idle',                to: 'handlingIdleWarning', name: 'warnIdle'           },
  { from: 'handlingIdleWarning', to: 'idle',                name: 'resolveIdleWarning' },
  { from: 'completingJob',       to: 'idle',                name: 'completeDone'       },
  { from: 'cancelingJob',        to: 'idle',                name: 'cancelDone'         },
  { from: 'handlingJobWarning',  to: 'cancelingJob',        name: 'cancel'             },
  { from: 'handlingJobWarning',  to: processingJob,         name: 'resolveJobWarning'  },

  // PROCESSING JOB events
  { from: 'startingJob',         to: 'executingJob',        name: 'startDone'          },
  { from: 'executingJob',        to: 'pausing',             name: 'pause'              },
  { from: 'executingJob',        to: 'parking',             name: 'park'               },
  { from: 'executingJob',        to: 'completingJob',       name: 'complete'           },
  { from: 'pausing',             to: 'paused',              name: 'pauseDone'          },
  { from: 'paused',              to: 'resuming',            name: 'resume'             },
  { from: 'resuming',            to: 'executingJob',        name: 'resumeDone'         },
  { from: 'parking',             to: 'parked',              name: 'park'               },
  { from: 'parked',              to: 'unparking',           name: 'unpark'             },
  { from: 'unparking',           to: 'executingJob',        name: 'unparkDone'         },

  // META STATE events
  { from: available,             to: 'initializing',        name: 'reset'              },
  { from: available,             to: 'uninitialized',       name: 'unplug'             },
  { from: connected,             to: 'disconnecting',       name: 'disconnect'         },
  { from: connected,             to: 'error',               name: 'connectedError'     },
  { from: processingJob,         to: 'cancelingJob',        name: 'cancel'             },
  { from: processingJob,         to: 'handlingJobWarning',  name: 'warnJob'            },

  /* eslint-enable no-multi-spaces */
];

module.exports = {
  metaStates: {
    processingJob,
    connected,
    available,
  },
  fsmEvents,
};
