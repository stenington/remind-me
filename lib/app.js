require('datejs');
var nedb = require('nedb');
var path = require('path');

const USER_FORMAT = 'F';
const DB_FORMAT = 's';

module.exports = function (opts) {
  opts = opts || {};
  var print = opts.printDoc || function () {};
  var filename = opts.filename || path.join(__dirname, '../remind.db');

  function getDb() {
    return new nedb({
      filename: filename,
      autoload: true
    });
  }

  function query (q, opts, cb) {
    opts = opts || {};

    cb = cb || function done (err, docs) {
      if (err) throw err;
      docs.forEach(print);
    }

    function normalize (doc) {
      return {
        when: Date.parse(doc.when).toString(USER_FORMAT),
        what: doc.what
      };
    }

    var db = getDb();
    db.find(q).sort({when: 1}).exec(function (err, docs) {
      if (err) return cb(err);
      if (opts.remove) db.remove(q, {multi: true}, function (err) {
        if (err) return cb(err);
        cb(null, docs.map(normalize));
      });
      else cb(null, docs.map(normalize));
    });
  }
    
  var self = {
    parse: function (str) {
      return Date.parse(str).toString(USER_FORMAT);
    },
    store: function (when, what, cb) {
      when = Date.parse(when);
      getDb().insert({when: when.toString(DB_FORMAT), what: what}, cb);
    },
    see: function (span, cb) {
      var q = {};
      if (span === 'today') {
        q.when = {$lt: Date.parse('tomorrow').toString(DB_FORMAT)};
      }
      query(q, {}, cb);
    },
    check: function (opts, cb) {
      opts = opts || {};

      var now = Date.now(true);
      var q = {when: {$lte: now.toString(DB_FORMAT)}};

      query(q, opts, cb);
    }
  }

  return self;
};
