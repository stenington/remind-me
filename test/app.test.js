require('should');
var App = require('../lib/app');
var async = require('async');
var path = require('path');
var fs = require('fs');

describe('app', function () {
  
  var filename = path.join(__dirname, 'test.db');

  beforeEach(function(done) {
    fs.unlink(filename, function (err) {
      if (!err || err.code === 'ENOENT') return done();
      done(err);
    });
  });

  beforeEach(function () {
    this.app = new App({
      filename: filename
    });
  });

  describe('#parse', function () {
    it('should provide a standard human-readable date format', function () {
      this.app.parse('today').should.match(/\w+, \w+ \d\d, \d\d\d\d \d\d:\d\d:\d\d [AP]M/);
      this.app.parse('tomorrow 8am').should.match(/\w+, \w+ \d\d, \d\d\d\d 8:00:00 AM/);
      this.app.parse('june 22, 2014 10pm').should.include('June 22, 2014 10:00:00 PM');
    });
  });

  describe('#store', function () {
    it('should store reminders', function (done) {
      var app = this.app;
      app.store('nov 3 2013', 'do that thing', function (err) {
        if (err) return done(err);
        app.see('all', function (err, reminders) {
          if (err) return done(err);
          reminders.length.should.equal(1);
          reminders[0].should.have.properties('when', 'what');
          reminders[0].what.should.equal('do that thing');
          reminders[0].when.should.include('November 03, 2013 12:00:00 AM');
          done();
        });
      });
    });
  });

  describe('#see', function () {
    beforeEach(function(done) {
      var app = this.app;
      app.store('now', 'thing right now', function (err) {
        if (err) return done(err);
        app.store('tomorrow', 'thing tomorrow', done);
      });
    });

    it('should let you see all reminders', function (done) {
      this.app.see('all', function (err, reminders) {
        if (err) return done(err);
        reminders.length.should.equal(2);
        reminders[0].what.should.equal('thing right now');
        reminders[1].what.should.equal('thing tomorrow');
        done();
      });
    });

    it('should let you see today\'s reminders', function (done) {
      this.app.see('today', function (err, reminders) {
        if (err) return done(err);
        reminders.length.should.equal(1);
        reminders[0].what.should.equal('thing right now');
        done();
      });
    });
  });

  describe('#check', function () {
    beforeEach(function(done) {
      var app = this.app;
      app.store('yesterday 10am', 'thing one', function (err) {
        if (err) return done(err);
        app.store('yesterday 11am', 'thing two', done);
      });
    });

    it('should let you peek at triggered reminders', function (done) {
      var app = this.app;
      app.check({remove: false}, function (err, reminders) {
        reminders.length.should.equal(2);
        reminders[0].what.should.equal('thing one');
        reminders[1].what.should.equal('thing two');
        app.check({remove: false}, function (err, reminders) {
          reminders.length.should.equal(2);
          done();
        });
      });
    });

    it('should pop triggered reminders', function (done) {
      var app = this.app;
      app.check({remove: true}, function (err, reminders) {
        reminders.length.should.equal(2);
        reminders[0].what.should.equal('thing one');
        reminders[1].what.should.equal('thing two');
        app.check({remove: true}, function (err, reminders) {
          reminders.length.should.equal(0);
          done();
        });
      });
    });
  });

  describe('printDoc config', function () {
    it('should map printDoc across reminders as default callback', function (done) {
      var call = 0;
      var data = [
        {what: 'thing one', when: 'today 10am'},
        {what: 'thing two', when: 'today 11am'}
      ];

      var app = new App({
        filename: filename,
        printDoc: function (reminder) {
          reminder.what.should.equal(data[call].what);
          if (++call === data.length)
            done();
        }
      });

      async.eachSeries(data, function (reminder, cb) {
        app.store(reminder.when, reminder.what, cb);
      }, function (err) {
        if (err) return done(err);
        app.see('all'); // works for .check() as well
      });
    });
  });
});
