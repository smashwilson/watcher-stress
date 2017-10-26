Stress-test a node.js filesystem watcher. Includes a CLI interface that can be used to monitor resource usage over extended periods of time.

#### Installing

The latest and greatest:

```bash
$ git clone git@github.com:smashwilson/watcher-stress.git
$ cd watcher-stress
$ npm install

$ script/watcher-stress --help
```

The most recently dubbed "kind of stable I guess":

```bash
$ npm install -g @smashwilson/watcher-stress

$ watcher-stress --help
```

Super fancy npx fun times:

```bash
$ npx @smashwilson/watcher-stress --help
```

#### Usage

To see the most up-to-date command-line usage:

```bash
$ watcher-stress --help
```

Run one or more watchers in a terminal. Report event batches and errors as they arrive and periodically emit resource usage (CPU time, RAM).

```bash
$ watcher-stress --cli /tmp,/var
```

Record resource usage snapshots to a `.json` file as well:

```bash
$ watcher-stress --cli /etc --resource-log ${HOME}/watcher-usage.log
```

Stress-test nsfw by starting and stopping _n_ watchers on random directories in serial:

```bash
$ watcher-stress --serial-watchers 5000
```

Stress-test nsfw by starting _n_ watchers in parallel:

```bash
$ watcher-stress --parallel-watchers 5000
```
