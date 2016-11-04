/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import fs = require('graceful-fs')

class NodeJsInputFileSystem {
    readdir(path: string, callback: (err: Error, files: string[]) => void): void {
        fs.readdir(path, (err, files) => {
            callback(err, files && files.map(file => file.normalize ? file.normalize('NFC') : file))
        })
    }

    isSync() {
        return false
    }
}

interface NodeJsInputFileSystem {
    stat(path: string, callback?: (err: NodeJS.ErrnoException, stats: fs.Stats) => any): void;
    readFile(filename: string, encoding: string, callback: (err: NodeJS.ErrnoException, data: string) => void): void
    readlink(path: string, callback?: (err: NodeJS.ErrnoException, linkString: string) => any): void
}

export = NodeJsInputFileSystem

NodeJsInputFileSystem.prototype.stat = fs.stat.bind(fs);
NodeJsInputFileSystem.prototype.readFile = fs.readFile.bind(fs);
NodeJsInputFileSystem.prototype.readlink = fs.readlink.bind(fs)