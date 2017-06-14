Stress-test a node.js filesystem watcher. Includes a CLI interface that can be used to monitor resource usage over extended periods of time.

#### Installing

```bash
$ git clone git@github.com:smashwilson/watcher-stress.git
$ cd watcher-stress
$ npm install
```

#### Usage

To see the most up-to-date command-line usage:

```bash
$ npm start -- --help
```

Run one or more watchers in a terminal. Report event batches and errors as they arrive and periodically emit resource usage (CPU time, RAM).

```bash
$ npm start -- --cli /tmp,/var
```

Record resource usage snapshots to a `.json` file as well:

```bash
$ npm start -- --cli /etc --resource-log ${HOME}/watcher-usage.log
```

Stress-test nsfw by starting and stopping _n_ watchers on random directories in serial:

```bash
$ npm start -- --serial-watchers 5000
```

Stress-test nsfw by starting _n_ watchers in parallel:

```bash
$ npm start -- --paralle-watchers 5000
```
