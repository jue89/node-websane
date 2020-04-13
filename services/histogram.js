const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const qsem = require('qsem');

module.exports = ({scanDir, scanDirWatch}) => {
	const sem = qsem(1);

	const gen = (src, dst) => sem.limit(() => new Promise((resolve) => {
		const proc = childProcess.fork(path.join(__dirname, '../lib/histogram-worker.js'), {cwd: scanDir});
		proc.send(src);
		proc.on('message', (hist) => fs.writeFile(path.join(scanDir, dst), JSON.stringify(hist), resolve));
	}));

	scanDirWatch.on('add', (filePath) => {
		if (filePath.substr(-12) !== '.preview.jpg') return;
		gen(filePath, filePath.substr(0, filePath.length - 12) + '.meta.json')
			.then(() => console.log('histogram: generate', filePath))
			.catch((err) => console.error('histogram: error', err));
	});
}