const fs = require('fs-extra')

const {SingleEventMatcher, RenameEventMatcher} = require('./matcher')

class Change {
  constructor (tree) {
    this.tree = tree
  }

  isViable () {
    return true
  }
}

class FileCreationChange extends Change {
  async enact () {
    this.filePath = this.tree.newFileName()
    this.tree.fileWillBeAdded(this.filePath)
    await fs.writeFile(this.filePath, 'initial contents\n', {encoding: 'utf8'})
    this.tree.fileWasAdded(this.filePath)
    return new SingleEventMatcher({
      action: 'created',
      kind: 'file',
      path: this.filePath
    })
  }

  isViable () {
    return this.tree.hasDirectory()
  }

  toString () {
    return `[+ file ${this.filePath || '<undetermined>'}]`
  }
}

class FileModificationChange extends Change {
  async enact () {
    this.filePath = this.tree.randomFile()
    await fs.appendFile(this.filePath, 'appended a line\n')
    return new SingleEventMatcher({
      action: 'modified',
      kind: 'file',
      path: this.filePath
    })
  }

  isViable () {
    return this.tree.hasFile()
  }

  toString () {
    return `[* file ${this.filePath || '<undetermined>'}]`
  }
}

class FileDeletionChange extends Change {
  async enact () {
    this.filePath = this.tree.randomFile()
    this.tree.fileWasDeleted(this.filePath)
    await fs.unlink(this.filePath)
    return new SingleEventMatcher({
      action: 'deleted',
      kind: 'file',
      path: this.filePath
    })
  }

  isViable () {
    return this.tree.hasFile()
  }

  toString () {
    return `[- file ${this.filePath || '<undetermined>'}]`
  }
}

class FileRenameChange extends Change {
  async enact () {
    this.beforePath = this.tree.randomFile()
    this.afterPath = this.tree.newFileName()
    this.tree.fileWasDeleted(this.beforePath)
    this.tree.fileWillBeAdded(this.afterPath)
    await fs.rename(this.beforePath, this.afterPath)
    this.tree.fileWasAdded(this.afterPath)
    return new RenameEventMatcher({
      kind: 'file',
      oldPath: this.beforePath,
      path: this.afterPath
    })
  }

  isViable () {
    return this.tree.hasFile() && this.tree.hasDirectory()
  }

  toString () {
    return `[> file ${this.beforePath || '<undetermined>'} => ${this.afterPath || '<undetermined>'}]`
  }
}

class DirectoryCreationChange extends Change {
  async enact () {
    this.dirPath = this.tree.newDirectoryName()
    this.tree.directoryWillBeAdded(this.dirPath)
    await fs.mkdir(this.dirPath)
    this.tree.directoryWasAdded(this.dirPath)
    return new SingleEventMatcher({
      action: 'created',
      kind: 'directory',
      path: this.dirPath
    })
  }

  isViable () {
    return this.tree.hasDirectory()
  }

  toString () {
    return `[+ dir ${this.dirPath}]`
  }
}

class DirectoryDeletionChange extends Change {
  async enact () {
    this.dirPath = this.tree.randomEmptyDirectory()
    this.tree.directoryWasDeleted(this.dirPath)
    await fs.rmdir(this.dirPath)
    return new SingleEventMatcher({
      action: 'deleted',
      kind: 'directory',
      path: this.dirPath
    })
  }

  isViable () {
    return this.tree.hasEmptyDirectory()
  }

  toString () {
    return `[- dir ${this.dirPath || '<undetermined>'}]`
  }
}

class DirectoryRenameChange extends Change {
  async enact () {
    this.beforePath = this.tree.randomDirectory()
    this.afterPath = this.tree.newDirectoryName(this.beforePath)
    await this.tree.directoryWasRenamed(
      this.beforePath,
      () => fs.rename(this.beforePath, this.afterPath),
      this.afterPath
    )
    return new RenameEventMatcher({
      kind: 'directory',
      oldPath: this.beforePath,
      newPath: this.afterPath
    })
  }

  isViable () {
    return this.tree.hasDirectory()
  }

  toString () {
    return `[> dir ${this.beforePath || '<undetermined>'} => ${this.afterPath || '<undetermined>'}]`
  }
}

module.exports = {
  fileCreation: FileCreationChange,
  fileModification: FileModificationChange,
  fileDeletion: FileDeletionChange,
  fileRename: FileRenameChange,
  directoryCreation: DirectoryCreationChange,
  directoryDeletion: DirectoryDeletionChange,
  directoryRename: DirectoryRenameChange
}
