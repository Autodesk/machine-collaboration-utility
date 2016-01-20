/* global describe, it */
const should = require(`should`);

module.exports = function toDoListTests(server) {
  describe('To-do list unit test', function () {
    it('should return home page', function (done) {
      server
      .get('/')
      .end(function (err, res) {
        res.status.should.equal(200);
        done();
      });
    });
  });
};
