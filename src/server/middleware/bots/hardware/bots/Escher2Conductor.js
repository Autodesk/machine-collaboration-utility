const DefaultBot = require(`./DefaultBot`);

module.exports = class Escher2Conductor extends DefaultBot {
  constructor(app) {
    super(app);
    this.settings.name = `Escher 2 Conductor`;
    this.settings.model = `Escher2Conductor`;
    this.connectionType = `http`;
  }
  parkCommands(that) {
    return {
      code: 'M114',
      processData: (command, reply) => {
        const commandArray = [];

        const preParkLocation = {
          X: Number(reply.split('X:')[1].split('Y:')[0]),
          Z: Number(reply.split('Z:')[1].split('E:')[0]),
        };

        that.logger.info('preParkLocation ', preParkLocation);

        if (preParkLocation.Z < 18) {
          commandArray.push('G1 Y25 Z18 F3600');
        }
        commandArray.push('G1 Y2 F3600');
        commandArray.push('G92 E0');
        commandArray.push('G1 E-10 F1000');
        commandArray.push({
          postCallback: () => {
            that.fsm.parkDone();
          },
        });

        that.queue.queueCommands(commandArray);

        return true;
      },
    };
  }

  unparkCommands(that, xEntry, dryJob = 'false') {
    const commandArray = [
      {
        code: 'M114',
        processData: (command, reply) => {
          const purgeArray = [];
          that.logger.info('Unparking: ', xEntry, '\t', dryJob);
          that.logger.info('xEntry Type: ', typeof(xEntry));
          that.logger.info('dry Type: ', typeof(dryJob));

          if (xEntry !== undefined) {
            that.logger.info('Unparking: Moving to entry X');
            purgeArray.push(`G1 X${xEntry} F3600`);
          }
          if (dryJob.toLowerCase() === 'false') {
            that.logger.info('Unparking: Purging');

            purgeArray.push('G92 E-10');
            purgeArray.push('G1 E-2 F1000');
            purgeArray.push('G1 E0 F500');
            purgeArray.push('G1 E5 F200');
            purgeArray.push('G1 E4 F1800');
            purgeArray.push('G1 Y27 F3600');
          }
          commandArray.push({
            postCallback: () => {
              that.fsm.unparkDone();
            },
          });
          that.queue.queueCommands(purgeArray);
          return true;
        },
      },
    ];
    return commandArray;
  }
};
