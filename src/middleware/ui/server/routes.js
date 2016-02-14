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
const getApp = (self) => {
  self.router.get(self.routeEndpoint, async (ctx) => {
    await ctx.render(`ui/index`, {
      title: `Hydra-Print`,
      clientState: self.app.context.bot.getBot().state,
      jobs: self.app.context.jobs.getJobs(),
    });
  });
};

const uiRoutes = (self) => {
  getDocs(self);
  getApp(self);
};

module.exports = uiRoutes;
