#!/usr/bin/env node

const program = require('commander')
const colors = require('colors')

const cli = require('./cli')
const {createFacade, available} = require('./facade')
const serialWatchers = require('./serial-watchers')
const parallelWatchers = require('./parallel-watchers')
const gen = require('./gen')
const {setResourceLogFile, reportError} = require('./helpers')

colors.setTheme({
  banner: ['bold', 'inverse'],
  header: ['green', 'underline'],
  sidenote: 'dim',
  dangerBanner: ['red', 'bold', 'inverse'],
  danger: ['red', 'bold']
})

const watcherNames = available().join(', ')
const watcherRx = new RegExp('^(' + available().join('|') + ')$', 'i')

program
  .version(require('../package.json').version)
  .option('--use [impl]', `use specified watcher implementation (${watcherNames})`, watcherRx)
  .option('--logging-dir [path]', '(watcher only) produce diagnostic logging to files within a directory')
  .option('--log-main-stdout', '(watcher only) log main thread activity directly to stdout')
  .option('--log-worker-stdout', '(watcher only) log worker thread activity directly to stdout')
  .option('--log-polling-stdout', '(watcher only) log polling thread activity directly to stdout')
  .option('--poll', '(watcher only) force polling mode')
  .option('--polling-interval [ms]', '(watcher only) milliseconds between polling cycles', parseInt)
  .option('--polling-throttle [count]', '(watcher only) number of system calls to perform each cycle', parseInt)
  .option('--debounce [ms]', '(nsfw only) configure debouncing interval', parseInt)
  .option('-i, --interval [ms]', 'interval to publish resource usage statistics', parseInt)
  .option('-r, --resource-log [path]', 'log resource usage to a JSON file')
  .option('-c, --cli [paths,]', 'CLI mode', str => str.split(','))
  .option('-e, --exercise [exercise]', 'choose an exercise to perform (serial, parallel)', /^(serial|parallel)$/)
  .option('-g, --gen [path]', 'generate a random filesystem structure beneath a path')
  .option('--watcher-count [count]', 'configure the number of watchers for an exercise (default: 1000)', parseInt)
  .option('--dir-chance [0..1]', 'chance to generate a new subdirectory (default: 0.05)', parseFloat)
  .option('--dir-count [count]', 'number of random directories to generate (default: 10)', parseInt)
  .option('--file-count [count]', 'number of random files to generate (default: 200)', parseInt)
  .parse(process.argv)

program.interval = program.interval || 10 * 60 * 1000
setResourceLogFile(program.resourceLog)

// Ensure a backing implementation is specified
const facade = createFacade(program.use)

// Ensure exactly one benchmarking action is specified
const actionOptions = [program.cli, program.exercise, program.gen].filter(option => option !== undefined).length
if (actionOptions !== 1) {
  console.error('You must specify exactly one of --cli, --exercise, or --gen.')
  program.help()
}

async function main () {
  try {
    await facade.init({
      loggingDir: program.loggingDir,
      logMainStdout: program.logMainStdout,
      logWorkerStdout: program.logWorkerStdout,
      logPollingStdout: program.logPollingStdout,
      pollingInterval: program.pollingInterval,
      pollingThrottle: program.pollingThrottle
    })

    if (program.cli) {
      await cli(program.cli, facade, {
        debounce: program.debounce,
        usageInterval: program.interval,
        poll: program.poll
      })
    } else if (program.gen) {
      await gen(program.gen, {
        dirChance: program.dirChance || 0.05,
        dirCount: program.dirCount || 10,
        fileCount: program.fileCount || 200
      })
    } else if (program.exercise === 'serial') {
      await serialWatchers(facade, {
        poll: program.poll,
        count: program.watcherCount || 1000
      })
    } else if (program.exercise === 'parallel') {
      await parallelWatchers(facade, {
        poll: program.poll,
        count: program.watcherCount || 1000
      })
    }

    process.exit(0)
  } catch (err) {
    reportError(err)
    process.exit(1)
  }
}

main()
