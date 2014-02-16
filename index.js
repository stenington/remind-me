#!/usr/bin/env node

require('datejs');
var util = require('util');
var path = require('path');
var nedb = require('nedb');
var charm = require('charm')();

charm.pipe(process.stdout);
process.stdin.resume();
process.stdin.setEncoding('utf8');

var bell = '\u0007';

var opts = require('minimist')(process.argv.slice(2), {
  boolean: ['today', 'tomorrow', 'noon', 'peek', 'pop', 'watch', 'see'],
  alias: {
    'help': 'h'
  }
});

if (opts.help) {
  charm.write("Usage: ").write(path.basename(process.argv[1])).write(" [options] [text]\n")
    .write("\n")
    .foreground('magenta').write("#--->").foreground('yellow').write(" Yo!\n")
    .display('reset').write("\n")
    .write("Options:\n")
    .write("  -h, --help      Output usage information\n")
    .write("\n")
    .write("  --peek          See any reminders ready to send\n")
    .write("  --pop           See and remove any reminders ready to send\n")
    .write("  --see           See upcoming reminders for today, or --see all\n")
    .write("                    to see all upcoming reminders\n")
    .write("\n")
    .write("  --watch         Run continuously, popping reminders as they come up.\n")
    // TODO: add no-bell, no-color, f/force
    .write("\n")
    .write("  --on <date>     Set reminder for date\n")
    .write("  --today         Set reminder for today\n")
    .write("  --tomorrow>     Set reminder for tomorrow\n")
    .write("  --at <time>     Set reminder for time\n")
    .write("  --noon          Set reminder for noon\n")
    .write("  --to <text>     Set reminder text\n");
  process.exit(0);
}

try {
  if (opts.peek) run({remove: false, watch: opts.watch});
  else if (opts.pop) run({remove: true, watch: opts.watch});
  else if (opts.watch) run({remove: true, watch: true});
  else if (opts.see) see(opts._[0]);
  else set();
}
catch (err) {
  charm
    .foreground('red').write('Oh no, an error!\n')
    .display('reset').write(err);
  process.exit(1);
}


function run (opts) {
  if (opts.watch) setInterval(check.bind(this, opts), 60000);
  check(opts);
}

function check (opts) {
  opts = opts || {};

  var now = Date.now(true);
  var q = {when: {$lte: now.toString('u')}};

  query(q, opts);
}

function query(q, opts) {
  opts = opts || {};

  var db = getDb();

  db.find(q).sort({when: 1}).exec(function (err, docs) {
    if (err) throw err;

    function done (docs) {
      if (!opts.watch) return;
      else if (docs) charm.write('\n' + bell);
    }

    docs.forEach(function (doc) {
      charm
        .foreground('magenta').write("#--->\t")
        .foreground('blue').write(Date.parse(doc.when).toString('F'))
        .write('\t\t')
        .foreground('yellow').write(doc.what)
        .write('\n');
    });

    if (opts.remove) db.remove(q, {multi: true}, function (err) {
      if (err) throw err;
      done(docs.length);
    });
    else done(docs.length);
  });
}

function see (span) {
  var span = span || 'today';

  if (span !== 'today' && span !== 'all') {
    charm
      .foreground('magenta').write("#--->\t")
      .foreground('red').write('Can only --see all or --see today\n');
    return;
  }

  var q = {};
  if (span === 'today') {
    q.when = {$lt: Date.parse('tomorrow').toString('u')};
  }

  query(q);
}

function set () {
  var when;
  if (opts.today) when = 'today';
  else if (opts.tomorrow) when = 'tomorrow';
  else if (opts.on) when = opts.on;
  else if (!opts.at && !opts.noon) when = 'now';
  else when = 'today';

  if (opts.noon) when += ' 12:00 PM';
  else if (opts.at) when += ' ' + opts.at;

  var what = opts.to || (opts._ && opts._.join(' ')) || '???';
  when = Date.parse(when);
  // TODO: detect events in the past and alert?

  charm
    .write('Remind you to ')
    .foreground('yellow').write(what)
    .display('reset').write(' on or after ')
    .foreground('blue').write(when.toString('F'))
    .display('reset').write('? [')
    .display('bright').write('Y')
    .display('reset').write('/n] ');

  process.stdin.once('data', function (data) {
    data = data.trim() || 'y';
    if (data.toLowerCase() !== 'y') {
      charm
        .foreground('magenta').write("#--->\t")
        .foreground('red').write('Cancelled.\n');
      return;
    }

    var db = new nedb({
      filename: path.join(__dirname, 'remind.db'),
      autoload: true
    });

    db.insert({when: when.toString('u'), what: what}, function (err, doc) {
      if (err) throw err;
      else {
        charm
          .foreground('magenta').write("#--->\t")
          .foreground('green').write('Ok!\n');
      }
    });
  });
}

function getDb() {
  return new nedb({
    filename: path.join(__dirname, 'remind.db'),
    autoload: true
  });
}
