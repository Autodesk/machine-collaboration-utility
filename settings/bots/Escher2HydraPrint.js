const _ = require(`underscore`);

const HydraPrint = require(`./HydraPrint`);

const Escher2HydraPrint = function Escher2HydraPrint(app) {
  HydraPrint.call(this, app);

  _.extend(this.settings, {
    name: `Escher 2 HydraPrint`,
    model: `Escher2HydraPrint`,
  });

  _.extend(this.commands, {
    park: (self, params) => {
      self.fsm.park();
      self.queue.queueCommands({
        code: 'M114',
        processData: (command, reply) => {
          const commandArray = [];

          const preParkLocation = {
            X: Number(reply.data.split('X:')[1].split('Y:')[0]),
            Z: Number(reply.data.split('Z:')[1].split('E:')[0]),
          };

          self.logger.info('preParkLocation ', preParkLocation);

          if (preParkLocation.Z < 18) {
            commandArray.push('G1 Y25 Z18 F3600');
          }
          commandArray.push('G1 Y2 F3600');
          commandArray.push('G92 E0');
          commandArray.push('G1 E-10 F1000');
          commandArray.push({
            postCallback: () => {
              self.fsm.parkDone();
            },
          });

          self.queue.queueCommands(commandArray);

          return true;
        },
      });
      return self.getBot();
    },
    unpark: (self, params) => {
      self.fsm.unpark();

      const xEntry = params.xEntry;
      const dryJob = params.dryJob === undefined ? `false` : String(params.dryJob);
      const commandArray = [
        {
          code: 'M114',
          processData: (command, reply) => {
            const purgeArray = [];
            self.logger.info('Unparking: ', xEntry, '\t', dryJob);
            self.logger.info('xEntry Type: ', typeof(xEntry));
            self.logger.info('dry Type: ', typeof(dryJob));

            if (xEntry !== undefined) {
              self.logger.info('Unparking: Moving to entry X');
              purgeArray.push(`G1 X${xEntry} F3600`);
            }
            if (dryJob.toLowerCase() === 'false') {
              self.logger.info('Unparking: Purging');

              purgeArray.push('G92 E-10');
              purgeArray.push('G1 E-2 F1000');
              purgeArray.push('G1 E0 F500');
              purgeArray.push('G1 E5 F200');
              purgeArray.push('G1 E4 F1800');
              purgeArray.push('G1 Y27 F3600');
            }
            purgeArray.push({
              postCallback: () => {
                self.fsm.unparkDone();
              },
            });
            self.queue.queueCommands(purgeArray);
            return true;
          },
        },
      ];
      self.queue.queueCommands(commandArray);
      return self.getBot();
    },
  });
};

module.exports = Escher2HydraPrint;
