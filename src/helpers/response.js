
/*
 * Helper class for generating standardized REST API replies
 */
class Response {
  constructor(ctx, query, payload) {
    if (ctx.status < 400) {
      this.data = payload;
    } else {
      this.error = payload;
    }
    this.status = ctx.status;
    this.query = query;
  }
}

module.exports = Response;
