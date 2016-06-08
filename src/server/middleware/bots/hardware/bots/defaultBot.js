module.exports = class DefaultBot {
  constructor(app) {
    this.app = app;
    this.logger = app.context.logger;
    this.connectionType = undefined;

    this.settings = {
      name: `Default`,
      model: `defaultbot`,
      uniqueIdentifier: `default`,
      jogXSpeed: `1000`,
      jogYSpeed: `2000`,
      jogZSpeed: `1000`,
      jogESpeed: `120`,
      tempE: `200`,
      tempB: `0`,
      speedRatio: `1.0`,
      eRatio: `1.0`,
      offsetX: `0`,
      offsetY: `0`,
      offsetZ: `0`,
    };
    this.vid = undefined;
    this.pid = undefined;
    this.baudrate = undefined;
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
