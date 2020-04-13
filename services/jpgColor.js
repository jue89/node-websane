const path = require('path');
const qsem = require('qsem');
const exec = require('../lib/exec.js');
const convert = require('../lib/convert.js');

module.exports = async ({scanDir, scanDirWatch}) => {
	// check if scanimage executable is present
	await exec('convert', ['-version'], __dirname);

	// limit convert to one concurrent instance
	const sem = qsem(1);

	const c = (src, dst) => sem.limit(() => convert(src, dst, [
		'-level', '0%,85%',
		'-quality', '75'
	], scanDir));

	// create previews once a scan appear
	scanDirWatch.on('add', (filePath) => {
		if (filePath.substr(-5) !== '.tiff') return;
		c(filePath, filePath + '.color.jpg')
			.then((dst) => console.log('jpgColor:', dst))
			.catch((err) => console.error('jpgColor: error', err));
	});
};
