/* global describe, it */
const should = require(`should`);

module.exports = function toDoListTests(server) {
  describe('To-do list unit test', function () {
    it('should do something better than this test', function (done) {
      should(1).equal(1);
    });
  });
};
