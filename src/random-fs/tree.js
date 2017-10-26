const path = require('path')
const fs = require('fs-extra')
const {atRandom, tempDir} = require('../helpers')

class Tree {
  constructor (opts) {
    this.prefix = opts.prefix || 'watcher-stress-'
    this.directoryChance = opts.directoryChance || 0.05

    this.id = 0
    this.root = opts.root

    this.directories = new Set()
    this.emptyDirectories = new Set()
    this.files = new Set()
  }

  namegen (prefix, suffix = '') {
    const name = `${prefix}${this.id}${suffix}`
    this.id++
    return name
  }

  newDirectoryName () {
    return path.join(this.randomDirectory(), this.namegen('directory-'))
  }

  newFileName () {
    return path.join(this.randomDirectory(), this.namegen('file-', '.txt'))
  }

  getRoot () {
    return this.root
  }

  randomDirectory () {
    return atRandom(Array.from(this.directories))
  }

  randomFile () {
    return atRandom(Array.from(this.files))
  }

  async createNewDirectory () {
    const name = this.newDirectoryName()
    await fs.mkdir(name, 0o777)
    this.directories.add(name)
    this.emptyDirectories.add(name)
    return name
  }

  async createNewFile () {
    const name = this.newFileName()
    this.emptyDirectories.delete(path.dirname(name))
    await fs.writeFile(name, '\n', {encoding: 'utf8'})
    this.files.add(name)
    return name
  }

  directoryWasDeleted (dirPath) {
    return this.directories.delete(dirPath)
  }

  fileWasDeleted (filePath) {
    return this.files.delete(filePath)
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
