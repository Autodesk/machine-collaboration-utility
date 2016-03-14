const Promise = require(`bluebird`);
const getIp = Promise.promisifyAll(require(`ip`));

const Response = require(`../helpers/response`);
const faye = require(`faye`);

/**
 * Render the to-do list's documentation
 */
const getDocs = (self) => {
  self.router.get(self.routeEndpoint + '/docs', async (ctx) => {
    const docLocation = `middleware/docs.yaml`;
    const middlewareLocation = [docLocation]; // Not sure why this needs to be in an array

    ctx.render(`docs`, {
      title: `Hydra-Print Docs`,
      middlewareLocation,
    });
  });
};

/**
 * Render the app
 */
const getBot = (self) => {
  self.router.get(self.routeEndpoint, async (ctx) => {
    const ip = await getIp.address();
    const jobs = self.app.context.jobs.getJobs();
    const files = self.app.context.files.files;
    let clientState;
    if (process.env.NODE_ENV === `conducting`) {
      clientState = self.app.context.conductor.getConductor().state;
      await ctx.render(`ui/conductor`, {
        title: `Hydra-Print`,
        clientState,
        jobs,
        files,
        ip,
      });
    } else {
      clientState = self.app.context.bot.getBot().state;
      await ctx.render(`ui/bot`, {
        title: `Hydra-Print`,
        clientState,
        jobs,
        files,
        ip,
      });
    }
  });
};

/**
 * Render the files
 */
const getFiles = (self) => {
  self.router.get(`${self.routeEndpoint}/files`, async (ctx) => {
    const ip = await getIp.address();
    const jobs = self.app.context.jobs.getJobs();
    const files = self.app.context.files.files;
    let clientState;
    if (process.env.NODE_ENV === `conducting`) {
      clientState = self.app.context.conductor.getConductor().state;
    } else {
      clientState = self.app.context.bot.getBot().state;
    }
    await ctx.render(`files/files`, {
      title: `Hydra-Print`,
      clientState,
      jobs,
      files,
      ip,
    });
  });
};

/**
 * Render the jobs
 */
const getJobs = (self) => {
  self.router.get(`${self.routeEndpoint}/jobs`, async (ctx) => {
    const ip = await getIp.address();
    const jobs = self.app.context.jobs.getJobs();
    const files = self.app.context.files.files;
    let clientState;
    if (process.env.NODE_ENV === `conducting`) {
      clientState = self.app.context.conductor.getConductor().state;
    } else {
      clientState = self.app.context.bot.getBot().state;
    }
    await ctx.render(`jobs/jobs`, {
      title: `Hydra-Print`,
      clientState,
      jobs,
      files,
      ip,
    });
  });
};

const appCommands = (self) => {
  const requestDescription = `Process UI Command`;
  self.router.post(self.routeEndpoint, async (ctx) => {
    const command = ctx.request.body.command;
    let commandReply;
    switch (command) {
      case `processFile`:
        const fileUuid = ctx.request.body.fileUuid;
        const file = self.app.context.files.getFile(fileUuid);
        if (fileUuid) {
          console.log('ok lets process this file', fileUuid);
        }
        // create a job
        const job = await self.app.context.jobs.createPersistentJob();

        // assign the file to the job`
        await self.app.context.jobs.setFile(job, file);

        // start the job
        await self.app.context.jobs.startJob(job);

        ctx.status = 200;
        commandReply = `success!`;
        break;
      // case `redoJob`:
      default:
        commandReply = `Command ${command} is not supported`;
    }
    ctx.body = new Response(ctx, requestDescription, commandReply);
  });
};

const uiRoutes = (self) => {
  getDocs(self);
  getBot(self);
  getFiles(self);
  getJobs(self);
  appCommands(self);
};

module.exports = uiRoutes;
