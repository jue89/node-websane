const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const qsem = require('qsem');

const mkdir = util.promisify(fs.mkdir);
const exec = (cmd, args, cwd) => new Promise((resolve) => {
	const stdoutChunks = [];
	const stderrChunks = []
	const proc = childProcess.spawn(cmd, args, {cwd});
	proc.stderr.on('data', (chunk) => stderrChunks.push(chunk));
	proc.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
	proc.on('exit', (rc) => {
		const stdout = Buffer.concat(stdoutChunks).toString().trim();
		const stderr = Buffer.concat(stderrChunks).toString().trim();
		resolve({rc, stdout, stderr});
	});
});

module.exports = async ({scanDir, scanArgs}) => {
	// check if scanimage executable is present
	await exec('scanimage', ['-V'], __dirname);

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
		const {rc, stderr} = await exec('scanimage', scanArgs, dir);
		if (rc !== 0) {
			throw new Error(`scanimage failed: ${stderr}`);
		}
	}).catch((err) => console.error('scan: error', err)));

	// some fake interval to prevent the appliation from exiting
	const interval = setInterval(() => {}, 1000000);
	return () => clearInterval(interval);
};
