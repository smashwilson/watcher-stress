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
  isViable () {
    return this.tree.hasDirectory()
  }

  prepare () {
    this.filePath = this.tree.newFileName()
  }

  matcher () {
    return new SingleEventMatcher({
      action: 'created',
      kind: 'file',
      path: this.filePath
    })
  }

  async enact () {
    this.tree.fileWillBeAdded(this.filePath)
    await fs.writeFile(this.filePath, 'initial contents\n', {encoding: 'utf8'})
    this.tree.fileWasAdded(this.filePath)
  }

  toString () {
    return `[+ file ${this.filePath || '<undetermined>'}]`
  }
}

class FileModificationChange extends Change {
  isViable () {
    return this.tree.hasFile()
  }

  prepare () {
    this.filePath = this.tree.randomFile()
  }

  matcher () {
    return new SingleEventMatcher({
      action: 'modified',
      kind: 'file',
      path: this.filePath
    })
  }

  async enact () {
    await fs.appendFile(this.filePath, 'appended a line\n')
  }

  toString () {
    return `[* file ${this.filePath || '<undetermined>'}]`
  }
}

class FileDeletionChange extends Change {
  isViable () {
    return this.tree.hasFile()
  }

  prepare () {
    this.filePath = this.tree.randomFile()
  }

  matcher () {
    return new SingleEventMatcher({
      action: 'deleted',
      kind: 'file',
      path: this.filePath
    })
  }

  async enact () {
    this.tree.fileWasDeleted(this.filePath)
    await fs.unlink(this.filePath)
  }

  toString () {
    return `[- file ${this.filePath || '<undetermined>'}]`
  }
}

class FileRenameChange extends Change {
  isViable () {
    return this.tree.hasFile() && this.tree.hasDirectory()
  }

  prepare () {
    this.beforePath = this.tree.randomFile()
    this.afterPath = this.tree.newFileName()
  }

  matcher () {
    return new RenameEventMatcher({
      kind: 'file',
      oldPath: this.beforePath,
      path: this.afterPath
    })
  }

  async enact () {
    this.tree.fileWasDeleted(this.beforePath)
    this.tree.fileWillBeAdded(this.afterPath)
    await fs.rename(this.beforePath, this.afterPath)
    this.tree.fileWasAdded(this.afterPath)
  }

  toString () {
    return `[> file ${this.beforePath || '<undetermined>'} => ${this.afterPath || '<undetermined>'}]`
  }
}

class DirectoryCreationChange extends Change {
  isViable () {
    return this.tree.hasDirectory()
  }

  prepare () {
    this.dirPath = this.tree.newDirectoryName()
  }

  matcher () {
    return new SingleEventMatcher({
      action: 'created',
      kind: 'directory',
      path: this.dirPath
    })
  }

  async enact () {
    this.tree.directoryWillBeAdded(this.dirPath)
    await fs.mkdir(this.dirPath)
    this.tree.directoryWasAdded(this.dirPath)
  }

  toString () {
    return `[+ dir ${this.dirPath}]`
  }
}

class DirectoryDeletionChange extends Change {
  isViable () {
    return this.tree.hasEmptyDirectory()
  }

  prepare () {
    this.dirPath = this.tree.randomEmptyDirectory()
  }

  matcher () {
    return new SingleEventMatcher({
      action: 'deleted',
      kind: 'directory',
      path: this.dirPath
    })
  }

  async enact () {
    this.tree.directoryWasDeleted(this.dirPath)
    await fs.rmdir(this.dirPath)
  }

  toString () {
    return `[- dir ${this.dirPath || '<undetermined>'}]`
  }
}

class DirectoryRenameChange extends Change {
  isViable () {
    return this.tree.hasDirectory()
  }

  prepare () {
    this.beforePath = this.tree.randomDirectory(null, true)
    this.afterPath = this.tree.newDirectoryName(this.beforePath)
  }

  matcher () {
    return new RenameEventMatcher({
      kind: 'directory',
      oldPath: this.beforePath,
      path: this.afterPath
    })
  }

  async enact () {
    await this.tree.directoryWasRenamed(
      this.beforePath,
      () => fs.rename(this.beforePath, this.afterPath),
      this.afterPath
    )
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
