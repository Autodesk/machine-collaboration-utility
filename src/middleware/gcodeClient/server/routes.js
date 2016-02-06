/**
 * Handle all logic at this endpoint for reading all of the jobs
 */
const getClient = (self) => {
  self.router.get(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      ctx.body = self.getGcodeClient();
    } catch (ex) {
      ctx.body = { status: `Gcode Client API "Get client" request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

/**
 * Handle all logic at this endpoint for sending a command to the client
 */
const processClientCommand = (self) => {
  self.router.post(`${self.routeEndpoint}/`, async (ctx) => {
    try {
      const command = ctx.request.body.command;
      if (command) {
        ctx.body = await self.processCommand(command);
      } else {
        throw `Command is undefined.`;
      }
    } catch (ex) {
      ctx.body = { status: `Job ${ctx.params.id} command request error: ${ex}` };
      ctx.status = 500;
    }
  });
};

const gcodeClientRoutes = (self) => {
  getClient(self);
  processClientCommand(self);
};

module.exports = gcodeClientRoutes;
