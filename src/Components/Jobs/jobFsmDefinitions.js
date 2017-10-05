const processingJob = [
  'running',
  'paused',
];

const fsmEvents = [
  /* eslint-disable no-multi-spaces */
  // JOB events
  { from: 'initializing', to: 'ready',    name: 'initializationDone' },
  { from: 'ready',        to: 'running',  name: 'start'              },

  // PROCESSING JOB events
  { from: 'running',      to: 'paused',   name: 'pause'              },
  { from: 'running',      to: 'complete', name: 'completeJob'        },
  { from: 'paused',       to: 'running',  name: 'resume'             },

  // META STATE events
  { from: processingJob,  to: 'canceled', name: 'cancel'             },

  /* eslint-enable no-multi-spaces */
];

module.exports = {
  metaStates: {
    processingJob,
  },
  fsmEvents,
};
