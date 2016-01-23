/**
 * Render the to-do list's documentation
 */
const getDocs = (self) => {
  self.router.get(self.routeEndpoint + '/docs', async (ctx) => {
    const docLocation = `middleware/docs2.yaml`;
    const middlewareLocation = [docLocation]; // Not sure why this needs to be in an array

    ctx.render(`docs`, {
      title: `Hydraprint Docs`,
      middlewareLocation,
    });
  });
};

const uiRoutes = (self) => {
  getDocs(self);
};

module.exports = uiRoutes;
