#!/usr/bin/env node

require('datejs');
var util = require('util');
var path = require('path');
var nedb = require('nedb');
var charm = require('charm')();
var App = require('./lib/app');

charm.pipe(process.stdout);

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

var app = new App({
  printDoc: function (doc) {
    charm
      .foreground('magenta').write("#--->\t")
      .foreground('blue').write(doc.when)
      .write('\t\t')
      .foreground('yellow').write(doc.what)
      .write('\n');
  }
});

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
    .display('reset').write(err.stack).write('\n');
  process.exit(1);
}


function run (opts) {
  if (opts.watch) setInterval(app.check.bind(app, opts), 60000);
  app.check(opts);
}

function see (span) {
  var span = span || 'today';

  if (span !== 'today' && span !== 'all') {
    charm
      .foreground('magenta').write("#--->\t")
      .foreground('red').write('Can only --see all or --see today\n');
    return;
  }

  app.see(span);
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
  // TODO: detect events in the past and alert?

  charm
    .write('Remind you to ')
    .foreground('yellow').write(what)
    .display('reset').write(' on or after ')
    .foreground('blue').write(app.parse(when))
    .display('reset').write('? [')
    .display('bright').write('Y')
    .display('reset').write('/n] ');

  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  process.stdin.once('data', function (data) {
    process.stdin.pause();
    data = data.trim() || 'y';

    if (data.toLowerCase() !== 'y') {
      charm
        .foreground('magenta').write("#--->\t")
        .foreground('red').write('Cancelled.\n');
      return;
    }
    
    app.store(when, what, function (err) {
      if (err) throw err;
      charm
        .foreground('magenta').write("#--->\t")
        .foreground('green').write('Ok!\n');
    });
  });
}
