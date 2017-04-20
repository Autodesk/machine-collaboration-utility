module.exports = function jog(self, params) {
  const commandArray = [];
  commandArray.push({
    code: 'M114',
    processData: (command, reply) => {
      const currentLocation = {};
      currentLocation.x = Number(reply.split('X:')[1].split('Y')[0]);
      currentLocation.y = Number(reply.split('Y:')[1].split('Z')[0]);
      currentLocation.z = Number(reply.split('Z:')[1].split('E')[0]);
      currentLocation.e = Number(reply.split('E:')[1].split(' ')[0]);
      const newPosition = currentLocation[params.axis] + params.amount;
      let feedRate;
      if (params.feedRate) {
        feedRate = params.feedRate;
      } else {
        feedRate = self.settings[`jog${params.axis.toUpperCase()}Speed`];
      }
      const jogGcode = `G1 ${params.axis.toUpperCase()}${newPosition} F${feedRate}`;
      self.queue.prependCommands(jogGcode);
      return true;
    },
  });
  self.queue.queueCommands(commandArray);
  return self.getBot();
};
