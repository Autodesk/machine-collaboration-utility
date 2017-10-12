const path = require('path');
const request = require('request-promise');
const bluebird = require('bluebird');

const botFsmDefinitions = require(path.join(
  __dirname,
  '../../../server/middleware/bots/botFsmDefinitions',
));

const delay = bluebird.delay;

module.exports = async function updateRoutine(self, params) {
  let doneConducting = true;
  let accumulatePercentComplete = 0;

  // If we're connected
  if (botFsmDefinitions.metaStates.connected.includes(self.fsm.current)) {
    const players = self.settings.custom.players;

    await bluebird.map(players, async (player) => {
      // Ping each player for status
      const pingJobParams = {
        method: 'GET',
        uri: player.endpoint,
        json: true,
      };
      try {
        const pingReply = await request(pingJobParams);
        if (botFsmDefinitions.metaStates.processingJob.includes(self.fsm.current)) {
          if (botFsmDefinitions.metaStates.processingJob.includes(pingReply.data.state)) {
            accumulatePercentComplete +=
              pingReply.data.currentJob.percentComplete == undefined
                ? 0
                : pingReply.data.currentJob.percentComplete;
            doneConducting = false;
          } else {
            accumulatePercentComplete += 100;
          }
          // Add the job's percent complete to the running total
        }
      } catch (ex) {
        doneConducting = false;
      }
    });

    // If still processing job, but done conducting, then complete and cleanup
    if (botFsmDefinitions.metaStates.processingJob.includes(self.fsm.current)) {
      if (doneConducting && self.fsm.current === 'executingJob') {
        self.fsm.complete();
        self.currentJob.percentComplete = 100;
        self.currentJob.fsm.completeJob();
        self.currentJob.stopwatch.stop();
        self.currentJob = undefined;
        self.fsm.completeDone();
        await delay(2000);

        self.app.io.broadcast('botEvent', {
          uuid: self.settings.uuid,
          event: 'update',
          data: self.getBot(),
        });
      } else if (self.settings.custom.players.length === 0) {
        self.currentJob.percentComplete = 0;
      } else {
        self.currentJob.percentComplete = Number(
          accumulatePercentComplete / self.settings.custom.players.length,
        ).toFixed(3);
      }
    }
  }
};
