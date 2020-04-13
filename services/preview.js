const path = require('path');
const qsem = require('qsem');
const exec = require('../lib/exec.js');

module.exports = async ({scanDir, scanDirWatch}) => {
	// check if scanimage executable is present
	await exec('convert', ['-version'], __dirname);

	// limit convert to one concurrent instance
	const sem = qsem(1);

	const convert = (src, dst) => sem.limit(() => exec('convert', [
		src,
		'-level', '5%,90%',
		'-sharpen', '0x1',
		'-resize', '1500x1500',
		'-quality', '75',
		dst
	], scanDir));

	// create previews once a scan appear
	scanDirWatch.on('add', (filePath) => {
		if (filePath.substr(-5) !== '.tiff') return;
		convert(filePath, filePath + '.preview.jpg')
			.then(() => console.log('preview: convert', filePath))
			.catch((err) => console.error('preview: error', err));
	});
};
