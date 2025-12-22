const fs = require('fs');
const path = require('path');
const util = require('util');
const qsem = require('qsem');
const exec = require('../lib/exec.js');

const mkdir = util.promisify(fs.mkdir);

const bin = process.env.SCANIMAGE_BIN || 'scanimage';

module.exports = async ({scanDir, scanArgs}) => {
	// check if scanimage executable is present
	await exec(bin, ['-V'], __dirname);

	// extend scan args by mandatory fields
	scanArgs = [
		...scanArgs,
		'--batch=%04d.tiff',
		'--format', 'tiff'
	];

	// allow only one scanimage instance to exist concurrently
	const sem = qsem(1);

	// scan on USR1 signal
	process.on('SIGUSR1', () => sem.limit(async () => {
		console.log('scan: request');
		const dir = path.join(scanDir, new Date().toISOString().replace(/:/g, '-'));
		await mkdir(dir);
		await exec(bin, scanArgs, dir);
	}).catch((err) => console.error('scan: error', err)));

	// some fake interval to prevent the appliation from exiting
	const interval = setInterval(() => {}, 1000000);
	return () => clearInterval(interval);
};
