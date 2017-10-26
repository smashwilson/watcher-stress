const path = require('path')
const fs = require('fs-extra')
const {atRandom, tempDir} = require('../helpers')

class Tree {
  constructor (opts) {
    this.prefix = opts.prefix || 'watcher-stress-'
    this.directoryChance = opts.directoryChance || 0.05

    this.id = 0
    this.root = opts.root

    this.directories = []
    this.files = []
  }

  namegen (prefix, suffix = '') {
    const name = `${prefix}${this.id}${suffix}`
    this.id++
    return name
  }

  getRoot () {
    return this.root
  }

  randomDirectory () {
    return atRandom(this.directories)
  }

  randomFile () {
    return atRandom(this.files)
  }

  async createNewDirectory () {
    const name = path.join(this.randomDirectory(), this.namegen('directory-'))
    await fs.mkdir(name, 0o777)
    this.directories.push(name)
    return name
  }

  async createNewFile () {
    const name = path.join(this.randomDirectory(), this.namegen('file-', '.txt'))
    await fs.writeFile(name, '\n', {encoding: 'utf8'})
    this.files.push(name)
    return name
  }

  async generate (opts) {
    if (this.root) {
      await fs.mkdirs(this.root)
    } else {
      this.root = await tempDir(this.prefix)
    }

    this.directories.push(this.root)

    let directoriesRemaining = opts.directoryCount || 100
    let filesRemaining = opts.fileCount || 1000

    while (directoriesRemaining > 0 || filesRemaining > 0) {
      if (directoriesRemaining > 0 && Math.random() < this.directoryChance) {
        await this.createNewDirectory()
        directoriesRemaining--
      } else {
        await this.createNewFile()
        filesRemaining--
      }
    }
  }
}

module.exports = {
  Tree
}
