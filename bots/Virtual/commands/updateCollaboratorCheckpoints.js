module.exports = async function updateCollaboratorCheckpoints(self, params) {
  self.status.collaborators = params.collaborators;
  self.commands.checkPrecursors(self);
};
