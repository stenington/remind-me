require ('should');
var App = require('../lib/app');
var path = require('path');
var fs = require('fs');

describe('date serialization', function () {

  var filename = path.join(__dirname, 'test.db');

  beforeEach(function (done) {
    fs.unlink(filename, function (err) {
      if (!err || err.code === 'ENOENT') return done();
      done(err);
    });
  });

  it('should serialize and de-serialize to the same date', function () {
    var when = Date.parse('nov 1 10pm');
    var db = when.toString('s');
    when.toString('F').should.equal(Date.parse(db).toString('F'));
  });

  it('should parse and print identical dates', function (done) {
    var when = 'nov 1 10pm';
    var app = new App({
      filename: filename
    });
    app.store(when, 'stuff', function (err) {
      if (err) return done(err);
      app.see('all', function (err, docs) {
        if (err) return done(err);
        docs.length.should.equal(1);
        docs[0].should.have.properties('when', 'what');
        docs[0].when.should.equal(app.parse(when));
        done();
      })
    });
  });
});