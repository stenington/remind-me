#remind-me

## Examples

### Add reminders
``` sh
$ remind-me "Do stuff right now"
$ remind-me --tomorrow --at 10am --to "Do stuff tomorrow morning"
$ remind-me --on 'nov 1' --to "Do stuff in November"
```

### See reminders
``` sh
$ remind-me [--peek | --pop]      # To see (and/or remove) triggered reminders
$ remind-me --watch               # Continually pop reminders and sound the system bell
```

### Get emailed reminders

In your crontab:

``` sh
*/5 * * * *      : Reminder! ; PATH=/path/to/node/bin /path/to/node/bin/remind-me --pop 
```