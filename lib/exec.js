const {spawn} = require('child_process');
module.exports = (cmd, args, cwd) => new Promise((resolve, reject) => {
	const stdoutChunks = [];
	const stderrChunks = []
	const proc = spawn(cmd, args, {cwd});
	proc.stderr.on('data', (chunk) => stderrChunks.push(chunk));
	proc.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
	proc.on('exit', (rc) => {
		const stdout = Buffer.concat(stdoutChunks).toString().trim();
		const stderr = Buffer.concat(stderrChunks).toString().trim();
		if (rc !== 0) reject(new Error(stderr));
		else resolve(stdout);
	});
});
