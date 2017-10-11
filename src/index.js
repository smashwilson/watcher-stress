#!/usr/bin/env node

const program = require('commander')
const colors = require('colors')

const cli = require('./cli')
const {createFacade} = require('./facade')
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

program
  .version('0.0.0')
  .option('--use [impl]', 'use specified watcher implementation (watcher [default], nsfw)', /^(watcher|nsfw)$/i)
  .option('--poll', 'force polling mode for watcher')
  .option('-d, --debounce [ms]', 'configure debouncing interval', parseInt)
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

if (program.cli) {
  cli(program.cli, facade, {
    debounce: program.debounce,
    usageInterval: program.interval,
    poll: program.poll
  })
}

function endAfter (promise) {
  return promise.then(
    () => process.exit(0),
    err => {
      reportError(err)
      process.exit(1)
    }
  )
}

if (program.gen) {
  endAfter(gen(program.gen, {
    dirChance: program.dirChance || 0.05,
    dirCount: program.dirCount || 10,
    fileCount: program.fileCount || 200
  }))
}

if (program.exercise === 'serial') {
  endAfter(serialWatchers(facade, {
    poll: program.poll,
    count: program.watcherCount
  }))
}

if (program.exercise === 'parallel') {
  endAfter(parallelWatchers(facade, {
    poll: program.poll,
    count: program.watcherCount
  }))
}
