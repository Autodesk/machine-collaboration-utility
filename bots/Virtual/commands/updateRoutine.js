/* global logger */
const path = require('path');

const botFsmDefinitions = require(path.join(
  process.env.PWD,
  'server/middleware/bots/botFsmDefinitions',
));

module.exports = function updateRoutine(self, params) {
  if (botFsmDefinitions.metaStates.connected.includes(self.fsm.current)) {
    self.status = {
      position: {
        x: (self.status && self.status.position && self.status.position.x) || undefined,
        y: (self.status && self.status.position && self.status.position.y) || undefined,
        z: (self.status && self.status.position && self.status.position.z) || undefined,
        e: (self.status && self.status.position && self.status.position.e) || undefined,
      },
      sensors: {
        t0: {
          temperature:
            (self.status &&
              self.status.sensors &&
              self.status.sensors.t0 &&
              self.status.sensors.t0.temperature) ||
            undefined,
          setpoint:
            (self.status &&
              self.status.sensors &&
              self.status.sensors.t0 &&
              self.status.sensors.t0.setpoint) ||
            undefined,
        },
        b0: {
          temperature:
            (self.status &&
              self.status.sensors &&
              self.status.sensors.b0 &&
              self.status.sensors.b0.temperature) ||
            undefined,
          setpoint:
            (self.status &&
              self.status.sensors &&
              self.status.sensors.b0 &&
              self.status.sensors.b0.setpoint) ||
            undefined,
        },
      },
      checkpoint: self.status && self.status.checkpoint,
      collaborators: (self.status && self.status.collaborators) || {},
      blocker: (self.status && self.status.blocker) || undefined,
    };

    const commandArray = [];
    commandArray.push({
      code: 'M114',
      processData: (command, reply) => {
        const newPosition = {
          x: undefined,
          y: undefined,
          z: undefined,
          e: undefined,
        };
        try {
          newPosition.x = Number(
            Number(reply.split('X:')[1].split('Y')[0]) - Number(self.settings.offsetX),
          ).toFixed(3);
          newPosition.y = Number(
            Number(reply.split('Y:')[1].split('Z')[0]) - Number(self.settings.offsetY),
          ).toFixed(3);
          newPosition.z = Number(
            Number(reply.split('Z:')[1].split('E')[0]) - Number(self.settings.offsetZ),
          ).toFixed(3);
          newPosition.e = reply.split('E:')[1].split(' ')[0];
          self.status.position = newPosition;
        } catch (ex) {
          logger.error('Failed to set position', reply, ex);
        }
        return true;
      },
    });
    commandArray.push({
      code: 'M105',
      processData: (command, reply) => {
        self.status.sensors.t0 = {
          temperature: '?',
          setpoint: '?',
        };
        self.status.sensors.b0 = {
          temperature: '?',
          setpoint: '?',
        };

        try {
          self.status.sensors.t0.temperature = reply.split('T:')[1].split(' ')[0];
          self.status.sensors.t0.setpoint = reply
            .split('T:')[1]
            .split('/')[1]
            .split(' ')[0];
        } catch (ex) {
          // logger.info('Failed to parse nozzle temp');
        }

        try {
          self.status.sensors.b0.temperature = reply.split('B:')[1].split(' ')[0];
          self.status.sensors.b0.setpoint = reply
            .split('B:')[1]
            .split('/')[1]
            .split(' ')[0];
        } catch (ex) {
          // logger.info('Failed to parse bed temp');
        }

        self.app.io.broadcast('botEvent', {
          uuid: self.settings.uuid,
          event: 'update',
          data: self.getBot(),
        });
        return true;
      },
    });
    self.queue.queueSequentialCommands(commandArray);
  }
};
