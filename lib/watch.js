const fs = require('fs');
const path = require('path');
const events = require('events');

class DirWatcher extends events.EventEmitter {
	constructor (dirPath) {
		super();
		this.dirPath = dirPath;
		this.content = new Map();
		setImmediate(() => this._init());
	}

	_init () {
		this.watcher = fs.watch(this.dirPath, (type, file) => {
			if (type !== 'rename') return;
			if (this.content.has(file)) this._remove(file);
			else this._add(file);
		});
		fs.readdir(this.dirPath, (err, files) => files.forEach((file) => {
			this._add(file);
		}));
	}

	destroy () {
		this.content.forEach((inst) => {
			if (inst instanceof DirWatcher) {
				inst.destroy();
			}
		});
		this.watcher.close();
	}

	_add (file) {
		const filePath = path.join(this.dirPath, file);
		fs.lstat(filePath, (err, stats) => {
			if (err) return;
			if (stats.isDirectory()) {
				const dirWatcher = new DirWatcher(filePath);
				this.content.set(file, dirWatcher);
				dirWatcher.on('add', (f) => this.emit('add', path.join(file, f)));
				dirWatcher.on('remove', (f) => this.emit('remove', path.join(file, f)));
			} else {
				this.content.set(file, true);
			}
		});
		this.emit('add', file);
	}

	_remove (file) {
		const inst = this.content.get(file);
		if (inst instanceof DirWatcher) {
			inst.destroy();
		}
		this.content.delete(file);
		this.emit('remove', file);
	}

	existance (filePath) {
		// convert string to array
		if (typeof filePath === 'string') filePath = filePath.split(path.delimiter);

		// end of chain
		if (filePath.length === 0) return Promise.resolve();

		const inst = this.content.get(filePath[0]);
		if (inst instanceof DirWatcher) {
			// is existing and a dir
			return inst._existance(filePath.slice(1));
		} else if (inst === true) {
			// is existing and a file
			if (filePath.length === 1) return Promise.resolve();
			else return Promise.reject(new Error('not a directory'));
		} else {
			// wait for creation
			return new Promise((resolve) => {
				const onAdd = (file) => {
					if (file !== filePath[0]) return;
					this.removeListener('add', onAdd);
					return this._existance(filePath);
				}
				this.on('add', onAdd);
			});
		}
	}
}

module.exports = (path) => new DirWatcher(path);
