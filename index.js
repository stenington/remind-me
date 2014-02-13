require('datejs');
var util = require('util');
var path = require('path');
var nedb = require('nedb');
var charm = require('charm')();

charm.pipe(process.stdout);
process.stdin.resume();
process.stdin.setEncoding('utf8');

var db = new nedb({filename: path.join(__dirname, 'remind.db'), autoload: true});
var bell = '\u0007';

var opts = require('minimist')(process.argv.slice(2), {
  boolean: ['today', 'tomorrow', 'noon', 'peek', 'pop', 'watch'],
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
    .write("\n")
    .write("  --watch         Run continuously, popping reminders as they come up.\n")
    // TODO: add no-bell, no-color
    .write("\n")
    .write("  --on <date>     Set reminder for date\n")
    .write("  --today         Set reminder for today\n")
    .write("  --tomorrow>     Set reminder for tomorrow\n")
    .write("  --at <time>     Set reminder for time\n")
    .write("  --noon          Set reminder for noon\n")
    .write("  --to <text>     Set reminder text\n");
  process.exit(0);
}

if (opts.peek) run({remove: false, watch: opts.watch});
else if (opts.pop) run({remove: true, watch: opts.watch});
else if (opts.watch) run({remove: true, watch: true});
else set();


function run (opts) {
  try {
    if (opts.watch) setInterval(query.bind(this, opts), 60000);
    query(opts);
  }
  catch (err) {
    charm.foreground('red').write('Oh no, an error!\n').write(err); 
    process.exit(1);
  }
}

function query (opts) {
  opts = opts || {};

  var now = Date.now(true);
  var q = {when: {$lte: now.toString('u')}};
  db.find(q, function (err, docs) {

    function done () {
      if (!opts.watch) process.exit(0);
      else charm.write('\n' + bell);
    }

    if (err) throw err;
    docs.forEach(function (doc) {
      charm.foreground('magenta').write("#--->\t")
        .foreground('blue').write(Date.parse(doc.when).toString('F'))
        .write('\t\t')
        .foreground('yellow').write(doc.what)
        .write('\n');
    });

    if (opts.remove) db.remove(q, {multi: true}, function (err) {
      if (err) throw err;
      done();
    });
    else done();
  });
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

  charm.write('Remind you to ')
    .foreground('yellow').write(what)
    .display('reset').write(' on or after ')
    .foreground('blue').write(when.toString('F'))
    .display('reset').write('? [')
    .display('bright').write('Y')
    .display('reset').write('/n] ');

  process.stdin.once('data', function (data) {
    data = data.trim() || 'y';
    if (data.toLowerCase() !== 'y') {
      charm.foreground('magenta').write("#--->\t")
        .foreground('red').write('Cancelled.\n');
      process.exit(0);
    }

    db.insert({when: when.toString('u'), what: what}, function (err, doc) {
      if (err) {
        charm.foreground('red').write('Reminder not set!');
        charm.write(err);
        process.exit(1);
      }
      else {
        charm.foreground('magenta').write("#--->\t")
          .foreground('green').write('Ok!\n');
        process.exit(0);
      }
    });
  });
}
